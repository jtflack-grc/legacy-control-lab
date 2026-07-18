// 5250 inbound (host → terminal) data-stream parser.
//
// One instance per session. `process(record)` is called once per
// telnet record (already GDS-unwrapped by the Terminal); the parser
// then walks the commands inside that record, updating the
// ScreenBuffer and queuing any reply records the host expects.
//
// Commands handled (sufficient to render a signon and submit
// credentials against a stock IBM i):
//
//     0x11  WTD   Write To Display          orders below
//     0x40  CU    Clear Unit                blanks screen + fields
//     0x20  CUA   Clear Unit Alternate      same, alternate size
//     0x50  CFT   Clear Format Table        forgets field formats
//     0x42  RIF   Read Input Fields         queue invite + remember readType
//     0x52  RMDT  Read MDT Fields           queue invite + readType
//     0x83  RMDT-Alt                        like RMDT but immediate
//     0x62  RSI   Read Screen Immediate     reply with full screen
//     0x21  WEC   Write Error Code          like WTD into error line
//     0x22  WEC-W Write Error Code to Win
//     0x23  ROLL  scroll partition          rare in signon
//     0x02  SAVE  Save Screen
//     0x12  RST   Restore Screen
//     0xF3  WSF   Write Structured Field    Query / ENPTUI (Phase 2b)
//
// Orders inside WTD / WEC payloads:
//     0x01 SOH    Start of Header
//     0x02 RA     Repeat to Address
//     0x03 EA     Erase to Address
//     0x04 ESC    end-of-command escape
//     0x10 TD     Transparent Data (skip)
//     0x11 SBA    Set Buffer Address (row,col)
//     0x12 WEA    Write Extended Attribute (skip; phase 2 cosmetic)
//     0x13 IC     Insert Cursor (row,col)
//     0x14 MC     Move Cursor (row,col)
//     0x15 WTDSF  Write To Display Structured Field (ENPTUI carrier)
//     0x1D SF     Start of Field
//
// Anything in 0x20-0x3F sets the basic attribute (colour/highlight).
// Any byte ≥0x40 is EBCDIC data and gets typed into the screen at the
// current cursor.
//
// On error we throw - Terminal.js catches it and (when the host asked
// for a response) sends a negative response. Right now telnet 5250
// doesn't use TN3270E-style positive responses, so the caller can
// ignore the success path.

import { Cmd, Order, isAttribute } from './Constants.js';
import { decodeWdsf } from './enptui/WdsfDecoder.js';
import { debugFor } from '../../../shared/src/core/debug.js';

const debug = debugFor('tn5250.parser');

export class InboundParser {
    constructor (screen) {
        this.screen = screen;

        // Queue of records to send back. Drained by Terminal after each
        // host record is fully processed.
        this.replies = [];

        // Read state - set by RIF / RMDT, consumed by sendAid().
        this.readPending  = false;
        this.readType     = 0x00;     // 0x42 read-input, 0x52 read-MDT
        this.invited      = false;

        // Inbound record pointer (parser-local, reset per record).
        this.buf = null;
        this.pos = 0;

        // Diagnostic: set of every attribute byte the host has ever
        // emitted. Useful when calibrating ATTR_BASE against a real
        // IBM i - the user can `console.log([...parser.attrSeen()])`
        // and see exactly which 0x20-0x3F variants are in play.
        this.#attrSeen = new Set();
    }

    /** Read-only view of the attribute bytes seen since startup. */
    attrSeen () { return Array.from(this.#attrSeen).sort(); }

    #attrSeen;

    /** Queue up `record` for transmission. Drained by Terminal after
     *  each host record is processed. */
    queueReply (record) { this.replies.push(record); }

    drainReplies () {
        const out = this.replies;
        this.replies = [];
        return out;
    }

    /** Process one GDS-unwrapped record payload. Inside the payload,
     *  commands are chained together and each one is preceded by an
     *  ESC byte (0x04). Bytes 0x00 / 0x01 are spacer/no-op bytes the
     *  host sometimes emits between commands; 0x07 is an audible-bell
     *  control with two extra parameter bytes.
     *
     *  Layout: ( [0x00|0x01]* 0x04 <cmd> <cmd-args...> )*
     *
     *  Walking the stream this way matches the IBM 5250 reference
     *  (the canonical Java implementation): every command-class byte
     *  arrives at the top level, and we dispatch on it. */
    process (payload) {
        this.buf = payload;
        this.pos = 0;

        try {
            this.#dispatchCommands();
        } finally {
            // Run the global attribute inheritance pass exactly once per
            // record. WTD and WEC orders can leave attribute places and
            // SF data cells in any order; this single walk computes the
            // final cell.attr value for every position the same way
            // real IBM 5250 hardware does at scan time.
            this.screen.recalcAttributes();
        }
    }

    #dispatchCommands () {
        while (this.pos < this.buf.length) {
            const cmd = this.#u8();
            switch (cmd) {
                case 0x00:                           // padding - skip
                case 0x01:                           // padding - skip
                case 0x04:                           // ESC separator before next cmd
                    break;
                case 0x07: {                          // audible bell + 2 reserved bytes
                    this.screen.alarm = true;
                    if (this.pos < this.buf.length) this.#u8();
                    if (this.pos < this.buf.length) this.#u8();
                    break;
                }
                case Cmd.WRITE_TO_DISPLAY:           this.#wtd(true);  break;
                case Cmd.WRITE_ERROR_CODE:           this.#wtd(false); break;
                case Cmd.WRITE_ERROR_CODE_TO_WINDOW: this.#wtd(false); break;
                case Cmd.CLEAR_UNIT:                 this.screen.clearUnit(); break;
                case Cmd.CLEAR_UNIT_ALT: {
                    // Clear Unit Alternate is followed by a 1-byte param
                    // that selects the alternate screen size. Per the
                    // IBM 5250 reference only 0x00 is valid; anything else is
                    // an error condition (we surface as a warning).
                    const param = this.pos < this.buf.length ? this.#u8() : 0;
                    if (param !== 0x00) {
                        debug.warn(`CUA with unsupported param 0x${param.toString(16)} — ignoring resize`);
                    }
                    this.screen.clearUnit();
                    break;
                }
                case Cmd.CLEAR_FORMAT_TABLE:         this.screen.clearFormatTable(); break;
                case Cmd.READ_INPUT_FIELDS:          this.#read(0x42); break;
                case Cmd.READ_MDT_FIELDS:            this.#read(0x52); break;
                case Cmd.READ_MDT_IMMEDIATE_ALT:
                    // ALT immediate also has a 1-byte readType param.
                    if (this.pos < this.buf.length) this.#u8();
                    this.readType    = 0x83;
                    this.readPending = true;
                    break;
                case Cmd.READ_SCREEN_IMMEDIATE:
                case Cmd.READ_SCREEN_TO_PRINT:
                    // Host wants the entire presentation space sent
                    // back verbatim. The actual response is built by
                    // Terminal.js using OutboundBuilder.buildReadScreenResponse.
                    // We just flag the request so the outer layer fires
                    // the response after the record is fully parsed.
                    this.readScreenRequested = true;
                    break;
                case Cmd.WRITE_STRUCTURED_FIELD:
                    this.#wsf();
                    return;        // WSF always ends the record
                case Cmd.SAVE_SCREEN:                this.screen.saveScreen(); return;
                case 0x03:                           // Save Partial Screen
                    this.screen.saveScreen(); return;
                case Cmd.RESTORE_SCREEN:             this.screen.restoreScreen(); return;
                case 0x13:                           // Restore Partial Screen
                    this.screen.restoreScreen(); return;
                case Cmd.ROLL:                       this.#roll(); break;
                default:
                    // Unknown command. Log and bail rather than trash
                    // the rest of the stream.
                    debug.warn(`unknown command 0x${cmd.toString(16).padStart(2,'0')} at offset ${this.pos - 1}`);
                    return;
            }
        }
    }

    // ---- byte cursor ---------------------------------------------------

    #u8 ()  { return this.buf[this.pos++] & 0xFF; }
    #peek () { return this.buf[this.pos] & 0xFF; }
    #u16 () {
        const hi = this.#u8();
        const lo = this.#u8();
        return (hi << 8) | lo;
    }

    // ---- WTD -----------------------------------------------------------

    #wtd (hasControls) {
        if (hasControls) {
            const cc0 = this.#u8();
            const cc1 = this.#u8();
            this.#processCc(cc0, cc1);
        }

        while (this.pos < this.buf.length) {
            const b = this.#u8();
            switch (b) {
                case Order.SOH:   this.#orderSoh();   break;
                case Order.RA:    this.#orderRa();    break;
                case Order.EA:    this.#orderEa();    break;
                case Order.ESC:   return;           // command terminator
                case Order.TD: {
                    // Transparent Data carries `len` raw bytes that must
                    // be placed into the buffer verbatim at the cursor —
                    // they're "transparent" only in the sense that the
                    // host does not want the parser to interpret them as
                    // orders or attributes. Per the IBM 5250 reference,
                    // each byte is treated like a plain data byte.
                    const len = this.#u16();
                    for (let i = 0; i < len && this.pos < this.buf.length; i++) {
                        this.screen.placeByte(this.#u8());
                    }
                    break;
                }
                case Order.SBA:   this.#orderSba();   break;
                case Order.WEA: {
                    // Write Extended Attribute - 2-byte (type, value)
                    // pair that overrides the running "pen" for the
                    // cells emitted after it, until the next basic
                    // attribute (0x20-0x3F) reset. Most hosts only use
                    // the basic attribute table; WEA appears when the
                    // host wants colours / underlines outside that
                    // table. We record it on the screen so future
                    // placeByte() calls inherit the extension.
                    const type = this.#u8();
                    const value = this.#u8();
                    this.screen.setExtendedAttr(type, value);
                    break;
                }
                case Order.IC: {
                    const row = this.#u8();
                    const col = this.#u8();
                    this.screen.setPendingInsert(true, row, col);
                    break;
                }
                case Order.MC: {
                    const row = this.#u8();
                    const col = this.#u8();
                    this.screen.setPendingInsert(false, row, col);
                    break;
                }
                case Order.WTDSF: {
                    // The WTDSF body is one OR MORE concatenated ENPTUI
                    // segments. The first two bytes of each segment are
                    // its length (which includes those length bytes).
                    // We hand the entire body to the ENPTUI decoder and
                    // it walks the segment chain itself.
                    const segLen = this.#u16();
                    const start  = this.pos - 2;
                    const end    = Math.min(start + segLen, this.buf.length);
                    const body   = this.buf.subarray(start, end);
                    try {
                        decodeWdsf(body, this.screen);
                    } catch (err) {
                        debug.warn('enptui decoder error:', err);
                    }
                    this.pos = end;
                    break;
                }
                case Order.SF:    this.#orderSf();    break;
                default:
                    if (isAttribute(b)) {
                        this.screen.placeAttribute(b);
                        this.#attrSeen.add(b);
                    } else {
                        this.screen.placeByte(b);
                    }
                    break;
            }
        }
    }

    /** Control-character bytes 0 and 1 of a WTD command (CC0/CC1).
     *  Verified byte-for-byte against the IBM 5250 reference.
     *
     *  CC0 - top 3 bits dispatch on 8 cases. Any non-zero high-nibble
     *  locks the keyboard during the WTD; specific cases also reset
     *  MDT flags and / or null the non-bypass field contents.
     *
     *     0x00 = no action (keyboard stays as-is)
     *     0x20 = lock keyboard only
     *     0x40 = reset MDT (null) + lock
     *     0x60 = reset MDT (keep null) + lock
     *     0x80 = clear non-bypass (null) + lock
     *     0xA0 = clear non-bypass + reset MDT (null) + lock
     *     0xC0 = clear non-bypass (null) + reset MDT (null) + lock
     *     0xE0 = clear non-bypass (keep null) + reset MDT (keep null) + lock
     *
     *  CC1 - bit flags (NB: our old mapping was wrong on every bit):
     *     0x08 = unlock keyboard after WTD completes (WCC2_UNLOCK)
     *     0x04 = sound alarm (WCC2_ALARM)
     *     0x02 = message light off
     *     0x01 = message light on */
    #processCc (cc0, cc1) {
        const cc0Top = cc0 & 0xE0;
        if (cc0Top !== 0x00) this.screen.keyboardLocked = true;
        if (cc0Top === 0x40 || cc0Top === 0x60
         || cc0Top === 0xA0 || cc0Top === 0xC0 || cc0Top === 0xE0) {
            this.screen.resetMdtFlags();
        }
        if (cc0Top === 0x80 || cc0Top === 0xA0
         || cc0Top === 0xC0 || cc0Top === 0xE0) {
            this.screen.nullModifiedFields();
        }

        if (cc1 & 0x08) this.screen.keyboardLocked = false;
        if (cc1 & 0x04) this.screen.alarm = true;
        if (cc1 & 0x02) { this.screen.messageLight = false; }
        if (cc1 & 0x01) { this.screen.messageLight = true;  }
    }

    #orderSoh () {
        // Layout per IBM 5250 Functions Reference §3.4.4:
        //   SOH <len> <flag1> <reserved> <reserved> <reserved> <errRow>
        //       <pfMask1> <pfMask2> <pfMask3>
        //
        //   flag1 bit 0x80 = reset MDT flag on all fields
        //   errRow         = row at which the host wants error msgs
        //   pfMask1        = enable bits for PF24..PF17 (high → low)
        //   pfMask2        = enable bits for PF16..PF9
        //   pfMask3        = enable bits for PF8..PF1
        //
        // pfMaskN bits are 1 = enabled. The terminal must refuse to send
        // an AID for any disabled PF key (real 5250 hardware beeps and
        // does nothing). We track the 24-bit composite mask on the
        // screen for the OutboundBuilder / Terminal to consult.
        const len = this.#u8();
        const end = this.pos + len;
        if (end > this.buf.length) { this.pos = this.buf.length; return; }

        const flag1 = (this.pos < end) ? this.#u8() : 0;
        // Per the IBM 5250 reference: SOH byte layout
        // after the length byte is flag1, reserved, resequence, errRow,
        // pfMask1, pfMask2, pfMask3 = 7 bytes total. We previously
        // skipped 3 bytes between flag1 and errRow which consumed the
        // errRow itself and shifted every subsequent field by one.
        if (this.pos < end) this.#u8();   // reserved
        if (this.pos < end) this.#u8();   // resequence
        const errRow = (this.pos < end) ? this.#u8() : 0;
        // Three optional PF-enable bytes. Bit 7 (high) of byte 0 is PF1,
        // bit 0 (low) is PF8; byte 1 covers PF9-PF16; byte 2 PF17-PF24.
        // Real 5250 hardware refuses to generate an AID when its key
        // bit is clear; we mirror the behaviour at submit time.
        const pfBytes = [
            (this.pos < end) ? this.#u8() : 0,
            (this.pos < end) ? this.#u8() : 0,
            (this.pos < end) ? this.#u8() : 0,
        ];
        this.pos = end;

        this.screen.startOfHeader({
            resetMdt: (flag1 & 0x80) !== 0,
            errRow,
            pfBytes,
        });
    }

    #orderRa () {
        // RA <row> <col> <byte>
        const row  = this.#u8();
        const col  = this.#u8();
        const byte = this.#u8();
        this.screen.repeatToAddress(row, col, byte);
    }

    #orderEa () {
        // EA <row> <col> <length> <length-1 attribute-plane bytes>
        // Per the IBM 5250 reference §3.4.6, the
        // EA order always carries a length byte after the address, and
        // length-1 additional bytes naming attribute planes to clear
        // (we don't model planes separately, so we consume and ignore
        // those bytes — but failing to consume them garbles the rest
        // of the WTD stream).
        const row    = this.#u8();
        const col    = this.#u8();
        const length = this.pos < this.buf.length ? this.#u8() : 0;
        for (let i = 0; i < length - 1 && this.pos < this.buf.length; i++) {
            this.#u8();
        }
        this.screen.eraseToAddress(row, col);
    }

    #orderSba () {
        const row = this.#u8();
        const col = this.#u8();
        this.screen.setCursor(row, col);
    }

    #orderSf () {
        // SF <FFW0> [FFW1 [FCW pairs...]] <attr> <len-hi> <len-lo>
        const ffw0 = this.#u8();
        let ffw1 = 0;
        let attr = 0;
        const fcws = [];

        if ((ffw0 & 0x40) === 0x40) {
            ffw1 = this.#u8();
            // Walk FCW pairs until we hit the attribute byte. Tags
            // valid per IBM ref include 0x80-0x85, 0x86, 0x88-0x8A,
            // 0x90-0x93, 0xB1-0xBF. No need to special-case 0x81 —
            // that was a defunct guard from an early experiment; real
            // FCW pairs of `0x81 <value>` are perfectly legal and must
            // be captured like any other tag.
            let next = this.#u8();
            while (!isAttribute(next)) {
                const v = this.#u8();
                fcws.push([next, v]);
                next = this.#u8();
            }
            attr = next;
        } else {
            // Bypass-bit-style FFW (single-byte): the FFW IS the attr.
            attr = ffw0;
        }

        const length = this.#u16();
        this.screen.addField({ attr, length, ffw0, ffw1, fcws });
    }

    // ---- read commands -------------------------------------------------

    #read (kind) {
        const cc0 = this.#u8();
        const cc1 = this.#u8();
        this.#processCc(cc0, cc1);
        this.readType    = kind;
        this.readPending = true;
        this.invited     = true;
        this.screen.keyboardLocked = false;
    }

    // ---- write-structured-field (Query / ENPTUI) ----------------------

    #wsf () {
        // Each WSF carries one or more structured-field segments back
        // to back. We dispatch on (class, type) - per IBM 5250 ref:
        //
        //   0xD9 0x70 - Query 5250 capabilities ("who are you?")
        //   0xD9 0x71 - Query Station State (cursor + screen geometry)
        //   0x00 0x88 - 5250 Erase/Reset
        //   0xB0 0x00 - Set Reply Mode (which extended fields we accept)
        //   0xD9 0x00 - Define Audit Window Table
        //   0xD9 0x01 - Read Text Screen
        //
        // Anything we don't implement, we acknowledge silently so the
        // host's record completes cleanly; only Query needs a reply.
        while (this.pos < this.buf.length) {
            if (this.pos + 4 > this.buf.length) return;
            const len = this.#u16();
            if (len < 4) return;
            const cls  = this.#u8();
            const type = this.#u8();
            const segEnd = this.pos - 4 + len;       // start was len bytes back
            const payload = this.buf.subarray(this.pos, Math.min(segEnd, this.buf.length));

            if (cls === 0xD9 && type === 0x70) {
                this.queryRequested = true;
            } else if (cls === 0xD9 && type === 0x71) {
                // Query Station State - host wants cursor row/col and
                // a snapshot of screen control state. We mark it so the
                // Terminal can emit the appropriate response.
                this.queryStationStateRequested = true;
            } else if (cls === 0xB0 && type === 0x00) {
                // Set Reply Mode - host tells us which extended-field
                // formats it expects in our outbound. We don't yet
                // emit extended-field formats anyway, so storing the
                // mode is enough to keep tests happy.
                this.replyMode = payload[0] ?? 0;
            } else if (cls === 0x00 && type === 0x88) {
                // 5250 Erase/Reset - same effect as Clear Unit + Clear
                // Format Table. Apply both and resume.
                this.screen.clearUnit();
                this.screen.clearFormatTable();
            } else {
                debug.warn(`WSF unknown (cls=0x${cls.toString(16)} type=0x${type.toString(16)} len=${len}) — acknowledged`);
            }
            this.pos = Math.min(segEnd, this.buf.length);
        }
    }

    // ---- ROLL ----------------------------------------------------------

    #roll () {
        // ROLL <direction-byte> <top-line> <bottom-line> <lines-to-roll>
        // direction-byte: 0x80 = up, 0x00 = down, lines in low 7 bits.
        const dir  = this.#u8();
        const top  = this.#u8();
        const bot  = this.#u8();
        const dist = dir & 0x7F;
        const up   = (dir & 0x80) !== 0;
        this.screen.roll(top, bot, dist, up);
    }
}
