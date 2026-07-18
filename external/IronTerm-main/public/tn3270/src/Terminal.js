// High-level orchestration: owns the screen buffer + the wire layers,
// translates keyboard / button events into AID/Read/Type/cursor moves,
// and flushes the parser's pending replies (Query Reply, AID, Read
// Buffer) back to the host.

import { ScreenBuffer } from './display/ScreenBuffer.js';
import { Renderer } from './ui/Renderer.js';
import { InputController } from './ui/InputController.js';
import { Oia } from './ui/Oia.js';
import { NvtView } from '../../shared/src/ui/NvtView.js';
import { TelnetStream } from './net/TelnetStream.js';
import { WebSocketTransport } from '../../shared/src/net/WebSocketTransport.js';
import { InboundParser } from './proto/InboundParser.js';
import { OutboundBuilder } from './proto/OutboundBuilder.js';
import { IndFile } from './proto/IndFile.js';
import { Aid, Models } from './proto/Constants.js';
import { Ebcdic } from '../../shared/src/proto/Ebcdic.js';
import { debugFor } from '../../shared/src/core/debug.js';

const debug = debugFor('tn3270.terminal');

/** Strip quotes and TSO sub-qualifier syntax from a dataset reference,
 *  then sanitise so the result can be a real filename:
 *    'HERC02.JCL.CNTL(MEMBER)'  →  HERC02.JCL.CNTL.MEMBER
 *    HERC02.MY.DATA             →  HERC02.MY.DATA
 *  Lower-cased so the file matches typical browser-download casing.   */
function toFilename (raw) {
    let s = raw.replace(/['"]/g, '').trim();
    const m = s.match(/^([^()]+)\((.+)\)$/);
    if (m) s = `${m[1]}.${m[2]}`;
    return s.replace(/[^\w.\-]/g, '_').toLowerCase();
}

export class Terminal {
    constructor ({ canvas, statusEl, oiaEls, nvtEl, codePage = 'CP037' }) {
        this.canvas = canvas;
        this.statusEl = statusEl;

        this.modelKey = 2;
        this.codePage = codePage;
        this.screen = new ScreenBuffer(Models[2].rows, Models[2].cols, Ebcdic.get(codePage));
        this.renderer = new Renderer(canvas, this.screen);
        this.indFile = new IndFile();
        this.parser = new InboundParser(this.screen, this.indFile);
        this.builder = new OutboundBuilder(this.screen);
        this.transport = null;
        this.telnet = null;
        this.oia = new Oia(oiaEls);
        this.nvt = new NvtView(nvtEl, (line) => this.#sendNvt(line));

        // IND$FILE callbacks - Terminal drives UI feedback and the
        // browser-side save / pick interactions. Bytes-on-wire is fully
        // handled inside `this.indFile`.
        this.indFile.onProgress = ({ direction, bytes }) => {
            this.oia.setTransfer('active', direction === 'upload' ? '⇡' : '⇣');
            this.flashStatus(`${direction}… ${bytes.toLocaleString()} B`, 'connecting', 800);
        };
        this.indFile.onComplete = (event) => {
            this.oia.setTransfer('done');
            if (event.direction === 'download') this.#saveDownload(event);
            else this.flashStatus(`upload done · ${event.bytes.toLocaleString()} B`, 'connected', 2000);
        };
        this.indFile.onError = (msg) => {
            this.oia.setTransfer('idle');
            this.flashStatus(msg, 'error', 3000);
        };

        this.input = new InputController({
            canvas,
            renderer: this.renderer,
            screen: this.screen,
            onAid:        (aid) => this.sendAid(aid),
            onType:       (s)   => this.type(s),
            onTab:        ()    => { this.screen.tab(); this.draw(); },
            onBackspace:  ()    => { this.screen.backspace(); this.draw(); },
            onMoveCursor: (a)   => { this.screen.cursor = a; this.draw(); },
            onToggleInsert: ()  => {
                const on = this.screen.toggleInsert();
                this.oia.setInsert(on);
                this.draw();
            },
            onFlash:      (msg) => this.flashStatus(msg),
        });

        this.lastAlarm = false;
        this.audioCtx = null;

        // Wire resize hooks
        window.addEventListener('resize', () => this.renderer.resize());
        if ('ResizeObserver' in window) {
            new ResizeObserver(() => this.renderer.resize()).observe(canvas);
        }
        this.renderer.resize();
        this.draw();
        this.setStatus('disconnected', 'disconnected');
    }

    setModel (key) {
        const m = Models[key];
        if (!m) return;
        this.modelKey = key;
        this.screen.resize(m.rows, m.cols);
        this.renderer.resize();
        this.draw();
    }

    /** Switch to a different EBCDIC code page. Safe to call mid-session;
     *  every existing screen cell is re-rendered through the new table.
     *  Falls back to CP037 if the name isn't known. */
    setCodePage (name) {
        const ebcdic = Ebcdic.get(name);
        this.codePage = ebcdic.name;
        this.screen.setEbcdic(ebcdic);
        this.draw();
    }

    // ---- connection lifecycle -----------------------------------------

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
            send:        (b) => this.transport?.send(b),
            onRecord:    (rec, meta) => this.handleRecord(rec, meta),
            onState:     (s)   => this.onTelnetState(s),
            onNvt:       (b)   => this.nvt.append(b),
            terminalType: m.terminalType,
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
        // Surface negotiation progress visually. Once BINARY is on, the
        // host is going to start sending 3270 records - hide the NVT
        // banner so the canvas can take over.
        if (state.deviceType) {
            this.setStatus(`negotiated ${state.deviceType}`, 'connecting');
            this.oia.setModel(state.deviceType);
        } else if (state.tn3270e) {
            this.oia.setModel('TN3270E');
        } else if (state.binary && state.eor) {
            this.oia.setModel('TN3270');
        }
        if (state.binary) this.nvt.hide();
    }

    #sendNvt (text) {
        this.telnet?.sendNvtText(text);
    }

    // ---- inbound -------------------------------------------------------

    handleRecord (record, meta = {}) {
        // Wrap parsing so a single malformed record can't take down the
        // session. If the host asked for a response (ALWAYS or ERROR),
        // we acknowledge with positive on success / negative on failure;
        // otherwise we stay quiet (RFC 2355 §5.4 - unsolicited responses
        // are wrong even on success).
        let parseError = null;
        try {
            this.parser.process(record);
        } catch (err) {
            parseError = err;
            debug.warn('parser error:', err.message);
        }

        const wantsResponse  = meta.responseFlag === 0x01 || meta.responseFlag === 0x02;
        const alwaysResponse = meta.responseFlag === 0x02;
        const seq = meta.seq ?? 0;
        if (parseError) {
            if (wantsResponse)
                this.telnet?.sendNegativeResponse(seq, parseError.senseCode ?? 0x10);
        } else if (alwaysResponse) {
            this.telnet?.sendPositiveResponse(seq);
        }

        // The host might have asked us a Query - answer it BEFORE
        // anything else so it gets the answer in time.
        if (this.parser.queryRequested) {
            this.parser.queryRequested = false;
            const reply = this.builder.buildQueryReply();
            this.telnet?.sendRecord(reply);
        }
        // Read commands (RB / RM / RMA) - answer with a screen dump.
        if (this.parser.readRequest) {
            const req = this.parser.readRequest;
            this.parser.readRequest = null;
            const aid = Aid.NO_AID;
            const out = req.kind === 'RB'
                ? this.builder.buildReadBuffer(aid, this.parser.replyMode, this.parser.replyModeAttrs)
                : this.builder.buildReadModified(aid, req.kind === 'RMA');
            this.telnet?.sendRecord(out);
        }

        // IND$FILE - the driver may have queued one or more reply records
        // (ack OPEN, ack data buffer, send next upload chunk, etc.).
        // Each goes out as its own 3270 record.
        for (const reply of this.indFile.drainReplies())
            this.telnet?.sendRecord(reply);

        if (this.screen.alarm && !this.lastAlarm) {
            this.tryBeep();
            this.oia.flashAlarm();
        }
        this.lastAlarm = !!this.screen.alarm;
        this.screen.alarm = false;

        this.draw();
    }

    // ---- outbound (user actions) --------------------------------------

    sendAid (aidByte) {
        if (!this.telnet) return;
        // Pre-flight: if any unprotected field has a Validation attr that
        // isn't satisfied, the real 3278 refuses to transmit and parks
        // the cursor on the offending field. Do the same - saves an
        // ugly host-side rejection (and matches user expectations from
        // physical terminals).
        const v = this.screen.validateForAid(aidByte);
        if (v) {
            this.screen.cursor = (v.field.start + 1) % this.screen.size;
            this.screen.alarm = true;
            this.tryBeep();
            this.oia.flashAlarm();
            this.flashStatus(`field requires ${v.reason}`, 'error', 2000);
            this.draw();
            return;
        }

        // Sniff the user's typed command for an IND$FILE GET - if found,
        // remember the dataset name so the upcoming download lands on
        // disk with a sensible filename instead of "transfer.bin". The
        // host doesn't include the dataset name in any of the WSF data
        // records, so this client-side sniff is the only reasonable
        // way to learn it.
        const cmd = this.#extractIndFileCommand();
        if (cmd?.action === 'GET')
            this.indFile.setSuggestedName(toFilename(cmd.dataset));

        const out = this.builder.buildReadModified(aidByte, /*RMA*/ false);
        this.screen.keyboardLocked = true;
        this.telnet.sendRecord(out);
        this.draw();
    }

    /** Walk all unprotected fields, decode their content as a plain
     *  string, and look for an IND$FILE PUT/GET command. Returns
     *  `{ action: 'GET'|'PUT', dataset: string }` or null.            */
    #extractIndFileCommand () {
        for (const f of this.screen.fields) {
            if (f.protected) continue;
            let text = '';
            for (let n = 1; n < f.length; n++) {
                const idx = (f.start + n) % this.screen.size;
                const c = this.screen.cells[idx];
                if (c.startField) break;
                if (c.byte === 0x00) continue;
                text += c.glyph || ' ';
            }
            // Match either IND$FILE or its alt spelling IND£FILE - TSO
            // prefixes like "TSO " and any leading spaces are stripped.
            const m = text.match(/IND[$£]FILE\s+(GET|PUT)\s+(\S+)/i);
            if (m) return { action: m[1].toUpperCase(), dataset: m[2] };
        }
        return null;
    }

    /** Type a JS string into the terminal at the current cursor. Each
     *  character is encoded to EBCDIC and inserted into the focused
     *  unprotected field. The host doesn't see anything until the user
     *  presses an AID key - typing is purely client-side. */
    type (str) {
        if (this.screen.keyboardLocked) return;
        for (let i = 0; i < str.length; i++)
            this.screen.typeByte(this.screen.ebcdic.fromCharCode(str.charCodeAt(i)));
        this.draw();
    }

    // ---- status / housekeeping ----------------------------------------

    draw () {
        this.renderer.draw();
        this.oia.setLocked(this.screen.keyboardLocked);
        const r = ((this.screen.cursor / this.screen.cols) | 0) + 1;
        const c =  (this.screen.cursor % this.screen.cols) + 1;
        this.oia.setCursor(r, c);
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

    // ---- IND$FILE bridge ---------------------------------------------

    /** Browser-side save for a completed download. We synthesise an
     *  anchor click so the file lands in the user's Downloads folder
     *  with a sensible name (the dataset they asked for, cleaned up).  */
    #saveDownload ({ name, blob }) {
        const safeName = (name || 'transfer.bin').replace(/[^\w.\-]/g, '_');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Defer revoke - Safari needs the URL alive briefly after click.
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        this.flashStatus(`download: ${safeName} (${blob.size.toLocaleString()} B)`, 'connected', 3000);
    }

    /** Prompt the user for a dataset name, then type
     *  `IND$FILE GET 'dataset' ASCII CRLF` into the current screen
     *  and submit it. The host runs the IND$FILE program which then
     *  drives the download protocol; our IndFile driver collects the
     *  bytes and triggers a browser save when CLOSE arrives.          */
    requestDownload () {
        if (!this.telnet) {
            this.flashStatus('not connected', 'error', 2000);
            return;
        }
        if (this.screen.keyboardLocked) {
            this.flashStatus('keyboard locked - wait for the host', 'error', 2000);
            return;
        }
        const last = localStorage.getItem('ironterm.tn3270.lastDataset') ?? '';
        const ds = window.prompt(
            "Dataset to download (no quotes for prefix syntax, quotes for fully qualified):\n" +
            "  HERC01.MY.DATA            → prefixed\n" +
            "  'SYS1.JCLLIB(IEFBR14)'    → fully qualified",
            last);
        if (!ds) return;
        const trimmed = ds.trim();
        try { localStorage.setItem('ironterm.tn3270.lastDataset', trimmed); } catch {}
        // Quote the dataset if user gave a bare fully-qualified name
        // (contains a dot but isn't already quoted).
        const quoted = (/^['"]/.test(trimmed) || !trimmed.includes('.'))
            ? trimmed
            : `'${trimmed}'`;
        const cmd = `IND$FILE GET ${quoted} ASCII CRLF`;
        if (!this.#typeAtCursor(cmd)) {
            this.flashStatus('no input field on screen - go to TSO READY first', 'error', 3000);
            return;
        }
        this.draw();
        // Send the AID using the same path real keystrokes use, so the
        // command gets delivered to the host and the IND$FILE flow starts.
        this.sendAid(0x7D);   // ENTER
    }

    /** Type at the current cursor inside an unprotected field; if the
     *  cursor isn't placed there, fall back to the first unprotected
     *  field. Erases any leftover content in the field after the typed
     *  string (3278 "Erase EOF" semantic) so a previous command sitting
     *  in the same field doesn't tail onto the new one.
     *  Returns false when no unprotected field exists.                */
    #typeAtCursor (str) {
        const here = this.screen.fieldAt(this.screen.cursor);
        if (!here || here.protected || this.screen.cursor === here.start) {
            const target = this.screen.fields.find(f => !f.protected && f.length > 1);
            if (!target) return false;
            this.screen.cursor = (target.start + 1) % this.screen.size;
        }
        const fieldStart = this.screen.fieldAt(this.screen.cursor)?.start ?? -1;
        for (const ch of str)
            this.screen.typeByte(this.screen.ebcdic.fromCharCode(ch.charCodeAt(0)));
        if (fieldStart >= 0)
            this.screen.eraseFromCursorToFieldEnd(fieldStart);
        return true;
    }

    /** Open a file picker; on selection, queue the file in the
     *  IndFile driver. The host-side `IND$FILE PUT dataset` command
     *  then drives the upload protocol against this buffer.            */
    async pickUploadFile () {
        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';
        document.body.appendChild(input);
        return await new Promise((resolve) => {
            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                document.body.removeChild(input);
                if (!file) { resolve(null); return; }
                const bytes = new Uint8Array(await file.arrayBuffer());
                this.indFile.queueUpload(bytes, file.name);
                this.oia.setTransfer('queued', '⇡');
                this.flashStatus(`queued ${file.name} (${bytes.length.toLocaleString()} B). On TSO: IND$FILE PUT dataset`, 'connected', 4000);
                resolve(file);
            }, { once: true });
            input.click();
        });
    }

    tryBeep () {
        try {
            if (!this.audioCtx) {
                const Ctor = window.AudioContext || window.webkitAudioContext;
                if (!Ctor) return;
                this.audioCtx = new Ctor();
            }
            if (this.audioCtx.state === 'suspended')
                this.audioCtx.resume().catch(() => {});
            const o = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            o.type = 'sine'; o.frequency.value = 880;
            const t = this.audioCtx.currentTime;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.4,    t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
            o.connect(g).connect(this.audioCtx.destination);
            o.start(t); o.stop(t + 0.13);
        } catch { /* ignore */ }
    }
}
