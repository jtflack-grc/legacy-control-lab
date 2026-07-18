// Builds the records the terminal sends back to the host:
//   - AID (Read-Modified or Short-Read response)
//   - Read Buffer (full screen dump)
//   - Query Reply structured fields (in response to Read Partition Query)
//
// All output is byte-level - the caller wraps it in a TN3270E header
// and the IAC EOR framing.

import { Aid, Order, Sf, QR, isShortReadAid } from './Constants.js';
import { BufferAddress } from './BufferAddress.js';

export class OutboundBuilder {
    constructor (buffer) { this.buffer = buffer; }

    // ---- AID (Read Modified) ------------------------------------------

    /** Build the standard "user pressed an AID key" reply: AID byte +
     *  cursor address + every modified field's content (SBA + chars,
     *  with nulls suppressed). */
    buildReadModified (aidByte, readModifiedAll = false) {
        const buf = this.buffer;
        const out = [];
        out.push(aidByte);

        // PA / Clear with non-RMA reads send only the AID byte.
        if (!readModifiedAll && isShortReadAid(aidByte))
            return Uint8Array.from(out);

        // Cursor address
        const tmp = new Uint8Array(2);
        BufferAddress.encode(buf.cursor, tmp, 0);
        out.push(tmp[0], tmp[1]);

        // Walk modified fields and pack their content. The SBA points at
        // the FIRST CONTENT cell of the field (one past the FA byte -
        // i.e. startPosition + 1), which is what every host expects.
        // Pointing at the FA byte itself
        // makes z/OS / TSO reject the read with "UNDEFINED INPUT FIELD"
        // because the host then writes the typed bytes over the FA and the
        // field structure breaks.
        for (const f of buf.fields) {
            if (f.protected) continue;
            if (!f.modified) continue;
            const contentStart = (f.start + 1) % buf.size;
            BufferAddress.encode(contentStart, tmp, 0);
            out.push(Order.SBA, tmp[0], tmp[1]);
            for (let n = 1; n < f.length; n++) {
                const idx = (f.start + n) % buf.size;
                const c = buf.cells[idx];
                if (c.startField) break;
                if (c.byte === 0x00) continue;     // suppress nulls
                out.push(c.byte);
            }
        }
        return Uint8Array.from(out);
    }

    // ---- Read Buffer --------------------------------------------------

    /** Full screen dump: AID + cursor + every cell, including FAs. The
     *  `replyMode` was set by the host via Set Reply Mode SF (0x09):
     *
     *    0 - field mode: SF + FA byte for FA cells; raw bytes for others.
     *    1 - extended-field mode: SFE + attr-pairs for FA cells.
     *    2 - character mode: SA orders per content-cell change, for the
     *        attribute types listed in `replyModeAttrs` (e.g. [0x42] to
     *        ask for foreground colour only). Field cells still emit SFE.
     *
     *  Hosts that never send Set Reply Mode default to mode 0, which
     *  matches the behaviour we had before.                              */
    buildReadBuffer (aidByte = Aid.NO_AID, replyMode = 0, replyModeAttrs = []) {
        const buf = this.buffer;
        const out = [aidByte];
        const tmp = new Uint8Array(2);
        BufferAddress.encode(buf.cursor, tmp, 0);
        out.push(tmp[0], tmp[1]);

        // Track currently-emitted character attributes so we only insert
        // SA orders when the attribute actually changes - keeps the
        // reply compact.
        let curFg = 0, curBg = 0, curHl = 0;
        const wantFg = replyModeAttrs.includes(0x42);
        const wantBg = replyModeAttrs.includes(0x45);
        const wantHl = replyModeAttrs.includes(0x41);

        for (let i = 0; i < buf.size; i++) {
            const c = buf.cells[i];
            if (c.startField) {
                if (replyMode === 0) {
                    out.push(Order.SF, c.byte);
                } else {
                    // Both extended-field and character mode use SFE so
                    // the host can recover the full per-field attr set.
                    const pairs = [0xC0, c.byte];
                    if (c.foreground) pairs.push(0x42, c.foreground);
                    if (c.background) pairs.push(0x45, c.background);
                    if (c.highlight)  pairs.push(0x41, c.highlight);
                    if (c.validation) pairs.push(0xC1, c.validation);
                    out.push(Order.SFE, pairs.length / 2, ...pairs);
                }
                // Reset the running attr state at each field boundary.
                curFg = 0; curBg = 0; curHl = 0;
            } else {
                if (replyMode === 2) {
                    if (wantFg && c.foreground !== curFg) {
                        out.push(Order.SA, 0x42, c.foreground);
                        curFg = c.foreground;
                    }
                    if (wantBg && c.background !== curBg) {
                        out.push(Order.SA, 0x45, c.background);
                        curBg = c.background;
                    }
                    if (wantHl && c.highlight !== curHl) {
                        out.push(Order.SA, 0x41, c.highlight);
                        curHl = c.highlight;
                    }
                }
                out.push(c.byte);
            }
        }
        return Uint8Array.from(out);
    }

    // ---- Query Reply --------------------------------------------------

    /** Build a Query Reply record:
     *    AID (0x88) | { len(2) | 0x81 | qrType | payload } *
     *  Each query reply is a self-delimiting structured field. The order
     *  and contents follow the conventional set every host that sends
     *  a Query expects.                                                  */
    buildQueryReply () {
        const replies = [
            this.#qrUsableArea(),
            this.#qrCharacterSets(),
            this.#qrColor(),
            this.#qrHighlight(),
            this.#qrReplyModes(),
            this.#qrOemAux(),
            this.#qrDdm(),                 // critical: IND$FILE checks this
            this.#qrAuxDevices(),
            this.#qrImplicitPartition(),
        ];
        // Summary lists every reply type we're providing (including itself).
        const summaryTypes = [QR.SUMMARY, ...replies.map(r => r.type)];
        const summary = this.#qrSummary(summaryTypes);

        const all = [summary, ...replies];
        let total = 1;     // AID byte
        for (const r of all) total += r.bytes.length;

        const out = new Uint8Array(total);
        let p = 0;
        out[p++] = Aid.SF;
        for (const r of all) {
            out.set(r.bytes, p);
            p += r.bytes.length;
        }
        return out;
    }

    // Each helper returns { type, bytes } where bytes is the packed
    // structured field including its 2-byte length prefix.

    #wrap (type, payload) {
        const len = payload.length + 4;            // len(2) + 0x81 + qrType + payload
        const out = new Uint8Array(len);
        out[0] = (len >> 8) & 0xFF;
        out[1] = len & 0xFF;
        out[2] = Sf.QUERY_REPLY;                   // 0x81
        out[3] = type;
        out.set(payload, 4);
        return { type, bytes: out };
    }

    #qrSummary (types) {
        return this.#wrap(QR.SUMMARY, Uint8Array.from(types));
    }

    #qrUsableArea () {
        const cols = this.buffer.cols;
        const rows = this.buffer.rows;
        // Conventional UsableArea layout; bytes after the screen
        // dimensions are fixed values that all hosts accept.
        const payload = Uint8Array.from([
            0x01, 0x00,                     // flags1 = 12/14-bit, flags2
            (cols >> 8) & 0xFF, cols & 0xFF,
            (rows >> 8) & 0xFF, rows & 0xFF,
            0x01,                           // millimetres
            0x00, 0x00, 0x00, 0x00,         // x ratio
            0x01, 0x00,                     // y numerator
            0xD3, 0x03,                     // y denominator
            0x20, 0x00,                     // x units
            0x9E, 0x02, 0x58, 0x07,         // y units
            0x0C, 0x07, 0x80,               // buffer-size + flags
        ]);
        // Patch buffer-size (last 3 bytes) with rows*cols. The reference
        // hard-codes 1920 (model 2) but every host I've tested honours the
        // real value when it sees Implicit Partition.
        const size = rows * cols;
        payload[payload.length - 3] = (size >> 8) & 0xFF;
        payload[payload.length - 2] =  size       & 0xFF;
        return this.#wrap(QR.USABLE_AREA, payload);
    }

    #qrCharacterSets () {
        // Single character set: CGCSGID 697/1100 (CP037 family). This is
        // the generic "I'm a 3278/3279 with extended colour" default that
        // every host accepts.
        const payload = Uint8Array.from([
            0x82, 0x00, 0x07, 0x0C, 0x00, 0x00, 0x00, 0x00,
            0x07, 0x00, 0x00, 0x00, 0x02, 0xB9, 0x04, 0x17,
            0x01, 0x00, 0xF1, 0x03, 0xC3, 0x01, 0x36,
        ]);
        return this.#wrap(QR.CHARACTER_SETS, payload);
    }

    #qrColor () {
        // 16 colour pairs (action == request) - full 3279-class palette.
        const COLORS = [
            0x00, 0xF4, 0xF1, 0xF1, 0xF2, 0xF2, 0xF3, 0xF3,
            0xF4, 0xF4, 0xF5, 0xF5, 0xF6, 0xF6, 0xF7, 0xF7,
            0xF8, 0xF8, 0xF9, 0xF9, 0xFA, 0xFA, 0xFB, 0xFB,
            0xFC, 0xFC, 0xFD, 0xFD, 0xFE, 0xFE, 0xFF, 0xFF,
        ];
        const payload = new Uint8Array(2 + COLORS.length);
        payload[0] = 0x00;          // flags
        payload[1] = 0x10;           // 16 pairs
        payload.set(COLORS, 2);
        return this.#wrap(QR.COLOR, payload);
    }

    #qrHighlight () {
        const payload = Uint8Array.from([
            0x05,                                   // 5 pairs
            0x00, 0xF0,    // default → normal
            0xF1, 0xF1,    // blink
            0xF2, 0xF2,    // reverse
            0xF4, 0xF4,    // underscore
            0xF8, 0xF8,    // intensify
        ]);
        return this.#wrap(QR.HIGHLIGHT, payload);
    }

    #qrReplyModes () {
        // Field, extended-field, character.
        const payload = Uint8Array.from([0x00, 0x01, 0x02]);
        return this.#wrap(QR.REPLY_MODES, payload);
    }

    /**
     * Distributed Data Management Query Reply (0x95).
     *
     * THIS IS REQUIRED for IND$FILE file transfers in DFT mode. Without
     * it, the host falls back to legacy CUT-mode file transfer which we
     * don't implement, and IND$FILE either errors out or hangs.
     *
     * Bytes follow the standard DistributedDataManagement reply layout:
     *   flags(2)     limitIn(2)=16384   limitOut(2)=16384   subsets=1   ddmSubset=1
     */
    #qrDdm () {
        const payload = Uint8Array.from([
            0x00, 0x00,    // flags
            0x40, 0x00,    // limit-in  = 16384
            0x40, 0x00,    // limit-out = 16384
            0x01,          // subset count
            0x01,          // DDM subset id
        ]);
        return this.#wrap(QR.DDM, payload);
    }

    /** Auxilliary Devices reply (0x99) - empty flags, signals
     *  "no aux devices attached". Required by some hosts as a peer
     *  to DDM during file-transfer capability negotiation. */
    #qrAuxDevices () {
        const payload = Uint8Array.from([0x00, 0x00]);
        return this.#wrap(QR.AUX_DEVICES, payload);
    }

    /** OEM Auxilliary Device reply (0x8F) - identifies our terminal
     *  emulator name + device type. Bytes are mostly fixed (DDM-aware
     *  reply structure); only the 8-byte device type and 8-byte user
     *  name fields carry text. Both strings are EBCDIC CP037, padded
     *  with spaces (0x40) to 8 chars.                                  */
    #qrOemAux () {
        // Standard OEM Aux reply layout, with our own ID strings.
        const payload = Uint8Array.from([
            0x00, 0x00,                                      // flags + refID
            0xC9, 0xD9, 0xD6, 0xD5, 0xF3, 0xF2, 0xF7, 0xF0,  // "IRON3270" (device type, EBCDIC)
            0x89, 0x99, 0x96, 0x95, 0xA3, 0x85, 0x99, 0x94,  // "ironterm" (user name, EBCDIC)
            // Self-defining-parameters block - values came from a real
            // captured from a working session and accepted by every IND$FILE host
            // I've seen.
            0x04, 0x01, 0x00, 0x00, 0x25, 0xFF,
            0x02, 0x06, 0x00, 0x00, 0xC0, 0xD5, 0x9D, 0x50,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x28, 0x4E,
            0x6F, 0x74, 0x20, 0x79, 0x65, 0x74, 0x20, 0x6C,
            0x6F, 0x67, 0x67, 0x65, 0x64, 0x20, 0x69, 0x6E,
            0x21, 0x29, 0x00,
        ]);
        return this.#wrap(QR.OEM_AUX, payload);
    }

    #qrImplicitPartition () {
        const cols = this.buffer.cols;
        const rows = this.buffer.rows;
        // Sub-self-id list: 0x0B 0x01 0x00 then primary 80×24 then
        // alternate cols×rows (per RFC).
        const payload = Uint8Array.from([
            0x00, 0x00,
            0x0B, 0x01, 0x00,
            0x00, 0x50,    // primary cols (80)
            0x00, 0x18,    // primary rows (24)
            (cols >> 8) & 0xFF, cols & 0xFF,
            (rows >> 8) & 0xFF, rows & 0xFF,
        ]);
        return this.#wrap(QR.IMPL_PARTITION, payload);
    }
}
