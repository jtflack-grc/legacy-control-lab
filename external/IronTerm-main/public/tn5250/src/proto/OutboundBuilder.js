// 5250 outbound (terminal → host) record builder.
//
// Every method returns a Uint8Array sized to the *payload* the
// telnet layer will frame with a GDS header (`GdsHeader.wrap`).
// The Terminal owns the wrapping so it can attach the right opcode
// and flag bits to each record.
//
// The big four for a usable signon:
//
//   buildAidResponse(aid)
//        Builds the response to an INVITE / READ_INPUT_FIELDS /
//        READ_MDT_FIELDS - 3 bytes of header (row, col, AID) followed
//        by all the unprotected/modified fields delimited by SBA orders.
//
//   buildQueryResponse(enhanced)
//        Answers the host's Query (WSF 0xD9/0x70) with the standard
//        64-byte structured field that identifies us as a 5250 emulator
//        and advertises capabilities (incl. ENPTUI when `enhanced`).
//
//   buildReadScreenResponse()
//        Dumps every cell of the presentation space verbatim (used
//        for screen-immediate reads / hostprint).
//
//   buildCancelInvite() / buildAttention()
//        Empty body records that drive housekeeping opcodes.

import { Aid, Gds, Adjust } from './Constants.js';

const ATTR_DEFAULT = 0x20;
const EBC_SPACE    = 0x40;
const EBC_ZERO     = 0xF0;

/** Slide the non-blank/non-null bytes in `arr` to the right edge and
 *  prefix the freed slots with `pad`. Used at submit time to honour
 *  the FFW byte 2 adjust nibble (right-zero / right-blank / mandatory).
 *  Mutates `arr` in place. */
function rightJustify (arr, pad) {
    // Find the rightmost non-space byte to know the actual data slice.
    let end = arr.length;
    while (end > 0 && (arr[end - 1] === EBC_SPACE || arr[end - 1] === 0))
        end--;
    if (end === 0) return;
    // Shift everything from [0..end) right so it ends at arr.length-1.
    const shift = arr.length - end;
    if (shift <= 0) return;
    for (let i = arr.length - 1; i >= shift; i--) arr[i] = arr[i - shift];
    for (let i = 0; i < shift; i++) arr[i] = pad;
}

export class OutboundBuilder {
    constructor (screen) {
        this.screen = screen;
    }

    // ---- AID response (Enter, PFx, Help, Roll, ...) -------------------

    /** Build the payload for a Put/Get opcode response. The host sees:
     *      <row> <col> <aid> [<SBA><row><col><field-data>]*
     *  Each modified field is preceded by an SBA pointing at its first
     *  data cell (one past the SF attribute byte). */
    buildAidResponse (aid) {
        const out = [];
        // Cursor row/col are 1-based on the wire.
        const row = (this.screen.cursor / this.screen.cols | 0) + 1;
        const col = (this.screen.cursor % this.screen.cols) + 1;
        out.push(row, col, aid);

        // Some AIDs (CLEAR, HELP, Roll, PA-like keys) submit no field
        // data; everything else streams the modified fields.
        if (!this.#isShortRead(aid)) {
            for (const f of this.screen.fields) {
                if (f.bypass) continue;
                if (!f.modified) continue;
                this.#emitField(out, f);
            }
        }
        return Uint8Array.from(out);
    }

    /** For Read MDT / Read Input we don't include cursor + AID -
     *  the host invited us so it knows where we are. The payload is
     *  just the SBA-delimited field stream. */
    buildReadResponse () {
        const out = [];
        for (const f of this.screen.fields) {
            if (f.bypass) continue;
            if (!f.modified) continue;
            this.#emitField(out, f);
        }
        return Uint8Array.from(out);
    }

    #emitField (out, f) {
        const startData = (f.start + 1) % this.screen.size;
        const row = (startData / this.screen.cols | 0) + 1;
        const col = (startData % this.screen.cols) + 1;
        out.push(0x11, row, col);                 // SBA row col

        // Collect the field's data bytes first. `f.length` is the count
        // of data cells (per IBM SF order semantics).
        const bytes = new Array(f.length).fill(EBC_SPACE);
        for (let i = 0; i < f.length; i++) {
            const idx = (startData + i) % this.screen.size;
            const cell = this.screen.cells[idx];
            if (cell.startField) {
                // Hit the next field's attribute place - shrink length.
                bytes.length = i;
                break;
            }
            bytes[i] = cell.byte === 0 ? EBC_SPACE : cell.byte;
        }

        // Apply field-level right-adjust / zero-fill before transmit.
        // 5250 reference: the bits in FFW byte 2 low nibble decide:
        //   5 = right-adjust, fill left with EBCDIC zero (0xF0)
        //   6 = right-adjust, fill left with EBCDIC blank (0x40)
        //   7 = mandatory-fill — pad zero-fill the same as 5
        // Other values (0..4) are "no adjustment". Real hardware does
        // the shift at field-exit time; we do it at submit which is
        // equivalent for non-DBCS fields.
        const adj = f.adjust;
        if (adj === Adjust.RIGHT_ZERO || adj === Adjust.MANDATORY) {
            rightJustify(bytes, EBC_ZERO);
        } else if (adj === Adjust.RIGHT_BLANK) {
            rightJustify(bytes, EBC_SPACE);
        }

        for (const b of bytes) out.push(b);
    }

    #isShortRead (aid) {
        // Per the 5250 reference, these AIDs submit ONLY cursor
        // row+col+AID with no field data:
        //   0xBD CLEAR
        //   0x6B / 0x6C / 0x6E  (PA1 / PA2 / PA3 - we don't bind keys
        //                       to these yet but the predicate stays)
        //   0xF3 HELP
        //   0xF6 PRINT
        //   0xF8 (reserved / display backup)
        return aid === Aid.HELP
            || aid === Aid.CLEAR
            || aid === Aid.PRINT
            || aid === 0x6B || aid === 0x6C || aid === 0x6E
            || aid === 0xF8;
    }

    // ---- Query response (RFC 1205 §5.3) -------------------------------

    /** 64-byte Query reply. Byte layout per the IBM 5250 reference.
     *  `enhanced=true` lights up the ENPTUI capability + window-headers
     *  bits; the actual primitives are decoded by enptui/WdsfDecoder.js. */
    buildQueryResponse (enhanced = true) {
        const a = new Uint8Array(64);
        a[0] = 0x00;                // cursor row (0 = none in a WSF reply)
        a[1] = 0x00;                // cursor col
        a[2] = 0x88;                // inbound write-structured-field AID
        // Segment length field. Per IBM 5250 ref the value is the count
        // of bytes from the length field through the end of the segment
        // (i.e. 64 - 3 = 61 bytes). Some hosts ship 0x0044 = 68 for a
        // 74-byte GDS frame, but our payload IS the 64-byte frame so 61 is the
        // value that matches the byte count emitted.
        a[3] = 0x00;
        a[4] = 61;
        a[5] = 0xD9;                // command class
        a[6] = 0x70;                // command type = Query
        a[7] = 0x80;                // flag byte
        a[8] = 0x06;                // controller hardware class ...
        a[9] = 0x00;                //   ... 0x0600 = "Other WSF / emulator"
        a[10] = 0x03;               // code level - V3R2.0
        a[11] = 0x02;
        a[12] = 0x00;
        // 13-28 reserved (zeroed by Uint8Array initialiser)
        a[29] = 0x01;               // device type 0x01 = 5250 emulator
        // Device model EBCDIC string: "3179002" for a colour SB session
        // so PUB400 reports the device as a 3179-2 (the only SB model
        // IBM treats as "ENPTUI-capable" without extra negotiation).
        a[30] = 0xF3; a[31] = 0xF1; a[32] = 0xF7;   // 3 1 7
        a[33] = 0xF9; a[34] = 0xF0; a[35] = 0xF0;   // 9 0 0
        a[36] = 0xF2;                               // 2
        a[37] = 0x01;               // keyboard id
        a[38] = 0x01;               // extended keyboard id
        a[39] = 0x00;               // reserved
        a[40] = 0x00; a[41] = 0x24; a[42] = 0x24; a[43] = 0x00;  // serial
        a[44] = 0x01; a[45] = 0xF4;  // max display fields = 500
        // 46-48: reserved
        a[49] = 0x70; a[50] = 0x12;  // controller display capability
        // Bytes 53/54 advertise enhanced/ENPTUI support:
        //   0x0F / 0xC8 = full ENPTUI (windows, selection fields, push
        //                 buttons, scroll bars, headers/footers, grids)
        a[53] = enhanced ? 0x0F : 0x00;
        a[54] = enhanced ? 0xC8 : 0x00;
        a[60] = 0x7B;               // reserved; constant on hardware
        a[61] = 0x11;               // model byte - 24x80 = 0x11 (27x132 = 0x31)
        return a;
    }

    // ---- screen dump --------------------------------------------------

    buildReadScreenResponse () {
        const n = this.screen.size;
        const out = new Uint8Array(n);
        let lastAttr = ATTR_DEFAULT;
        for (let i = 0; i < n; i++) {
            const cell = this.screen.cells[i];
            if (cell.attributePlace) {
                lastAttr = cell.byte;
                out[i] = lastAttr;
            } else {
                out[i] = cell.byte === 0 ? 0x40 : cell.byte;
            }
        }
        return out;
    }

    // ---- empty bodies for control opcodes -----------------------------

    /** Cancel-Invite uses a fixed empty payload + opcode 0x0A. */
    buildCancelInvite () { return new Uint8Array(0); }
    /** Attention uses ATN flag + empty payload + opcode 0x00. */
    buildAttention ()    { return new Uint8Array(0); }
}

// Reference exports so Terminal.js can spell out the flags it needs
// without re-importing from ./Constants.js.
export { Gds };
