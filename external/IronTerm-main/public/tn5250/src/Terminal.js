// High-level orchestrator for a TN5250 session.
//
// Owns the screen buffer + wire layers, translates keyboard / button
// events into AID / read / cursor moves, and drives the GDS framing
// in/out. Parallels the TN3270 Terminal but with 5250-specific
// opcodes and command flow.

import { ScreenBuffer } from './display/ScreenBuffer.js';
import { Renderer } from './ui/Renderer.js';
import { InputController } from './ui/InputController.js';
import { Oia } from './ui/Oia.js';
import { NvtView } from '../../shared/src/ui/NvtView.js';
import { TelnetStream } from './net/TelnetStream.js';
import { WebSocketTransport } from '../../shared/src/net/WebSocketTransport.js';
import { InboundParser } from './proto/InboundParser.js';
import { OutboundBuilder } from './proto/OutboundBuilder.js';
import * as Gds from './proto/GdsHeader.js';
import { Aid, Models, Gds as GdsConsts } from './proto/Constants.js';

// Map an AID byte back to its PF number, or null when it's not a PF.
function pfNumberFor (aid) {
    if (aid >= Aid.PF1  && aid <= Aid.PF12)  return aid - Aid.PF1  + 1;
    if (aid >= Aid.PF13 && aid <= Aid.PF24)  return aid - Aid.PF13 + 13;
    return null;
}
import { Ebcdic } from '../../shared/src/proto/Ebcdic.js';
import { debugFor } from '../../shared/src/core/debug.js';

const debug = debugFor('tn5250.terminal');

// IBM-5292-2 is the natural default for an ENPTUI-capable client: it's
// the 5250 model that introduced graphics + enhanced UI primitives, so
// our advertised Query Reply (which already lights up the ENPTUI bits)
// matches what the host expects from a 5292-class workstation.
const DEFAULT_MODEL = '5292-2';

export class Terminal {
    constructor ({ canvas, statusEl, oiaEls, nvtEl, codePage = 'CP037', modelKey = DEFAULT_MODEL }) {
        this.canvas = canvas;
        this.statusEl = statusEl;

        this.modelKey = modelKey;
        this.codePage = codePage;
        const m = Models[modelKey];
        this.screen   = new ScreenBuffer(m.rows, m.cols, Ebcdic.get(codePage));
        this.renderer = new Renderer(canvas, this.screen);
        this.parser   = new InboundParser(this.screen);
        this.builder  = new OutboundBuilder(this.screen);
        this.transport = null;
        this.telnet    = null;
        this.oia       = new Oia(oiaEls);
        this.nvt       = new NvtView(nvtEl, (line) => this.#sendNvt(line));

        // Bypass-signon / environment knobs - filled by main.js from
        // toolbar inputs before connect().
        this.envOptions = {};

        this.input = new InputController({
            canvas,
            renderer: this.renderer,
            screen: this.screen,
            onAid:        (aid) => this.sendAid(aid),
            onType:       (s)   => this.type(s),
            onBackspace:  ()    => { this.screen.backspace(); this.draw(); },
            onTab:        ()    => { this.screen.tab(); this.draw(); },
            onBackTab:    ()    => { this.screen.backTab(); this.draw(); },
            onMoveCursor: (i)   => { this.screen.cursor = i; this.draw(); },
            onFlash:      (msg) => this.flashStatus(msg),
        });

        window.addEventListener('resize', () => this.renderer.resize());
        if ('ResizeObserver' in window) {
            new ResizeObserver(() => this.renderer.resize()).observe(canvas);
        }
        this.renderer.resize();
        this.draw();
        this.setStatus('disconnected', 'disconnected');

        // Wire-level record log. Captures both directions of the 5250
        // datastream so we can post-mortem decode any rendering issue.
        // Last 200 records, dump via `terminal.dumpStream()`.
        this.streamLog = [];
        this.streamLogMax = 200;
        this.streamStartedAt = 0;
    }

    /** Push one record (in or out) onto the rolling log. */
    #logRecord (dir, opcode, flags, bytes) {
        if (this.streamStartedAt === 0) this.streamStartedAt = Date.now();
        const t = Date.now() - this.streamStartedAt;
        this.streamLog.push({
            t, dir, opcode, flags,
            hex: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(' '),
            len: bytes.length,
        });
        if (this.streamLog.length > this.streamLogMax)
            this.streamLog.splice(0, this.streamLog.length - this.streamLogMax);
    }

    /** Pretty-print every captured record. Copy the output and send it
     *  back for offline decoding when the rendering looks wrong. */
    dumpStream () {
        if (this.streamLog.length === 0) return '(stream log is empty - reconnect)';
        const lines = [
            `# IronTerm TN5250 stream log - ${this.streamLog.length} records`,
            `# format: [+ms] DIR opcode=NN flags=NN len=N : hex bytes`,
            '',
        ];
        for (const r of this.streamLog) {
            const t = String(r.t).padStart(7, ' ');
            const op = r.opcode.toString(16).padStart(2, '0');
            const fl = r.flags.toString(16).padStart(2, '0');
            lines.push(`[+${t}ms] ${r.dir} opcode=0x${op} flags=0x${fl} len=${r.len}`);
            // 32 bytes per line for readability
            const bytes = r.hex.split(' ');
            for (let i = 0; i < bytes.length; i += 32)
                lines.push('   ' + bytes.slice(i, i + 32).join(' '));
        }
        const text = lines.join('\n');
        console.log(text);
        // Also offer a download for big streams (clipboard truncates).
        try {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ironterm-tn5250-stream-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            debug.log('stream downloaded as .txt file');
        } catch (e) {
            debug.warn('could not trigger download:', e);
        }
        return text;
    }

    // ---- config --------------------------------------------------------

    setModel (key) {
        const m = Models[key];
        if (!m) return;
        this.modelKey = key;
        this.screen.resize(m.rows, m.cols);
        this.renderer.resize();
        this.draw();
    }
    setCodePage (name) {
        const ebcdic = Ebcdic.get(name);
        this.codePage = ebcdic.name;
        this.screen.setEbcdic(ebcdic);
        this.draw();
    }
    setEnvOptions (opts) { this.envOptions = opts ?? {}; }

    // ---- connection lifecycle ------------------------------------------

    async connect ({ url }) {
        if (this.transport) await this.disconnect();
        const m = Models[this.modelKey];
        this.screen.resize(m.rows, m.cols);
        this.renderer.resize();
        this.draw();
        this.setStatus('connecting…', 'connecting');
        this.oia.setConnection('connecting');
        this.oia.setModel('-');
        this.nvt.clear();
        this.nvt.hide();

        this.telnet = new TelnetStream({
            send:         (b) => this.transport?.send(b),
            onRecord:     (rec) => this.handleRecord(rec),
            onState:      (s) => this.onTelnetState(s),
            onNvt:        (b) => this.nvt.append(b),
            terminalType: m.terminalType,
            envOptions:   this.envOptions,
        });

        this.transport = new WebSocketTransport(url, {
            onOpen:  () => {
                this.setStatus('connected', 'connected');
                this.oia.setConnection('connected');
            },
            onData:  (b) => this.telnet.feed(b),
            onClose: (reason) => {
                this.setStatus(`disconnected: ${reason}`, 'disconnected');
                this.oia.setConnection('disconnected');
                this.cleanup();
            },
            onError: (err) => {
                this.setStatus(`error: ${err}`, 'error');
                this.oia.setConnection('error');
            },
        });
        try {
            this.transport.open();
        } catch (err) {
            this.setStatus(`error: ${err}`, 'error');
            this.oia.setConnection('error');
            this.cleanup();
        }
    }

    async disconnect () {
        if (!this.transport) return;
        this.transport.close();
        this.cleanup();
        this.setStatus('disconnected', 'disconnected');
        this.oia.setConnection('disconnected');
    }

    cleanup () {
        if (this.telnet) this.telnet.close();
        this.transport = null;
        this.telnet = null;
    }

    onTelnetState (state) {
        if (state.binary) this.nvt.hide();
        if (state.newEnviron) this.oia.setModel('TN5250E');
        else if (state.binary && state.eor) this.oia.setModel('TN5250');
        debug.log('telnet state',
            { binary: state.binary, eor: state.eor, ttype: state.ttype,
              newEnviron: state.newEnviron });
    }

    #sendNvt (text) { this.telnet?.sendNvtText(text); }

    // ---- inbound -------------------------------------------------------

    handleRecord (record) {
        const decoded = Gds.unwrap(record);
        if (!decoded) {
            debug.warn('dropped non-GDS record:',
                Array.from(record.slice(0, 32)).map(b => b.toString(16).padStart(2,'0')).join(' '),
                `(len=${record.length})`);
            this.#logRecord('IN ', 0xFF, 0, record);
            return;
        }
        const { opcode, flags, miscFlags1, payload } = decoded;
        this.#logRecord('IN ', opcode, flags, payload);
        debug.log(`record opcode=0x${opcode.toString(16).padStart(2,'0')} payload=`,
            Array.from(payload.slice(0, 48)).map(b => b.toString(16).padStart(2,'0')).join(' '),
            `(len=${payload.length})`);

        // Startup-confirmation / termination records: miscFlags1 byte
        // (offset 4 of the GDS header) carries 0x40 = termination,
        // 0x80 = startup confirmation, 0x90 = startup + diagnostics.
        // The payload is an SNA session announcement (system + device
        // name), NOT a 5250 command sequence. Trying to dispatch it
        // through #process() would crash on the first non-ESC byte.
        if (miscFlags1 === 0x80 || miscFlags1 === 0x90 || miscFlags1 === 0x40) {
            debug.log(`startup/termination record miscFlags1=0x${miscFlags1.toString(16)} — skipping parser dispatch`);
            return;
        }

        // Opcode-specific dispatch. PUT_GET / INVITE / OUTPUT_ONLY all
        // carry zero-or-more command bytes in the payload; the rest are
        // control opcodes with no body.
        switch (opcode) {
            case GdsConsts.Op.INVITE_OPERATION:
            case GdsConsts.Op.PUT_GET_OPERATION:
                // Both opcodes are an implicit "invite for input" once
                // the embedded WTD finishes drawing - the host expects
                // us to unlock and wait for an AID-bearing reply. This
                // matches the IBM 5250 invite-for-input semantics.
                try { this.parser.process(payload); }
                catch (err) { debug.warn('parser error:', err); }
                this.parser.readPending = true;
                this.parser.invited     = true;
                this.screen.keyboardLocked = false;
                break;
            case GdsConsts.Op.OUTPUT_ONLY:
            case GdsConsts.Op.SAVE_SCREEN:
            case GdsConsts.Op.RESTORE_SCREEN:
                try {
                    this.parser.process(payload);
                } catch (err) {
                    debug.warn('parser error:', err);
                }
                break;
            case GdsConsts.Op.READ_IMMEDIATE:
                // Host wants an immediate response without an AID; we
                // submit an "Enter with no data" reply.
                this.#sendOpcode(GdsConsts.Op.PUT_GET_OPERATION,
                                 this.builder.buildReadResponse());
                return;
            case GdsConsts.Op.READ_SCREEN:
                this.#sendOpcode(GdsConsts.Op.NO_OPERATION,
                                 this.builder.buildReadScreenResponse());
                return;
            case GdsConsts.Op.CANCEL_INVITE:
                this.parser.invited = false;
                this.#sendOpcode(GdsConsts.Op.CANCEL_INVITE, this.builder.buildCancelInvite());
                return;
            case GdsConsts.Op.MESSAGE_LIGHT_ON:
                this.screen.messageLight = true;
                this.oia.setMessageLight(true);
                break;
            case GdsConsts.Op.MESSAGE_LIGHT_OFF:
                this.screen.messageLight = false;
                this.oia.setMessageLight(false);
                break;
            case GdsConsts.Op.NO_OPERATION:
            default:
                break;
        }

        // Query → answer with our capability descriptor.
        if (this.parser.queryRequested) {
            this.parser.queryRequested = false;
            this.#sendOpcode(GdsConsts.Op.NO_OPERATION, this.builder.buildQueryResponse(true));
        }

        // Read Screen Immediate / To Print → dump the screen back.
        if (this.parser.readScreenRequested) {
            this.parser.readScreenRequested = false;
            this.#sendOpcode(GdsConsts.Op.NO_OPERATION, this.builder.buildReadScreenResponse());
        }

        if (this.screen.pendingCursor >= 0) {
            this.screen.cursor = this.screen.pendingCursor;
            this.screen.pendingCursor = -1;
        } else if (this.parser.readPending) {
            // The host invited input but didn't IC. Park the cursor at
            // the first focusable position - any SF input field OR
            // ENPTUI radio/checkbox/push-button item, whichever comes
            // first in buffer order. Without the ENPTUI fallback,
            // screens that have only checkboxes / radios leave the
            // cursor stuck at (1,1).
            const target = this.screen.firstFocusable();
            if (target !== null) this.screen.cursor = target;
        }
        debug.log(`after record: fields=${this.screen.fields.length} cursor=${this.screen.cursor} readPending=${this.parser.readPending}`);
        this.draw();
        if (this.parser.readPending && document.body.classList.contains('lab-embed')) {
            this.canvas?.focus?.({ preventScroll: true });
            if (document.activeElement !== this.canvas) {
                document.body.focus?.({ preventScroll: true });
            }
        }
    }

    // ---- outbound ------------------------------------------------------

    #sendOpcode (opcode, payload, flags = 0) {
        if (!this.telnet) return;
        this.#logRecord('OUT', opcode, flags, payload);
        const framed = Gds.wrap(payload, opcode, flags);
        this.telnet.sendRecord(framed);
    }

    sendAid (aidByte) {
        if (!this.telnet) return;
        // Honour the SOH pf-enable mask: refuse to transmit when the
        // host explicitly disabled the requested PF (real 5250 hardware
        // beeps and ignores). Help / Print / Clear / roll / Enter are
        // not part of the mask and always pass through.
        const pf = pfNumberFor(aidByte);
        if (pf !== null && !this.screen.isPfEnabled(pf)) {
            this.flashStatus(`PF${pf} disabled by host`, 'error');
            this.screen.alarm = true;
            this.draw();
            return;
        }
        debug.log(`sendAid 0x${aidByte.toString(16).padStart(2,'0')} at row=${(this.screen.cursor/this.screen.cols|0)+1} col=${(this.screen.cursor%this.screen.cols)+1}`);
        if (aidByte === Aid.HELP) {
            this.#sendOpcode(GdsConsts.Op.PUT_GET_OPERATION,
                             this.builder.buildAidResponse(aidByte),
                             GdsConsts.Flag.HLP);
            this.screen.keyboardLocked = true;
            this.draw();
            return;
        }
        this.#sendOpcode(GdsConsts.Op.PUT_GET_OPERATION,
                         this.builder.buildAidResponse(aidByte));
        this.screen.keyboardLocked = true;
        this.parser.readPending = false;
        this.draw();
    }

    sendAttention () {
        if (!this.telnet) return;
        this.#sendOpcode(GdsConsts.Op.NO_OPERATION, new Uint8Array(0), GdsConsts.Flag.ATN);
    }

    type (str) {
        if (this.screen.keyboardLocked) return;
        for (let i = 0; i < str.length; i++)
            this.screen.typeByte(this.screen.ebcdic.fromCharCode(str.charCodeAt(i)));
        this.draw();
    }

    // ---- housekeeping --------------------------------------------------

    draw () {
        this.renderer.draw();
        this.oia.setLocked(this.screen.keyboardLocked);
        const r = ((this.screen.cursor / this.screen.cols) | 0) + 1;
        const c =  (this.screen.cursor % this.screen.cols) + 1;
        this.oia.setCursor(r, c);
        if (this.screen.alarm) { this.oia.flashAlarm(); this.screen.alarm = false; }
    }

    setStatus (text, cls) {
        this.statusEl.textContent = text;
        this.statusEl.className = cls;
    }
    flashStatus (text, cls = 'connected', ms = 1500) {
        const prev = this.statusEl.textContent;
        const prevCls = this.statusEl.className;
        this.setStatus(text, cls);
        setTimeout(() => this.setStatus(prev, prevCls), ms);
    }
}
