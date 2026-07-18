// 5250 General Data Stream (GDS) record header - RFC 1205 §3.
//
// Every 5250 record on the wire is wrapped by a 10-byte header before
// the IAC EOR framing. The structure is fixed:
//
//   off  size  field                          value
//    0    2    total length (incl. header)    big-endian
//    2    2    record-type                    0x12 0xA0  (GDS)
//    4    2    reserved                       0x00 0x00
//    6    1    variable-header length         0x04
//    7    1    flags                          ERR/ATN/SRQ/TRQ/HLP
//    8    1    reserved                       0x00
//    9    1    opcode                         (Gds.Op.*)
//
// `wrap` and `unwrap` are inverse operations so that:
//     unwrap(wrap(payload, opcode, flags)) === { payload, opcode, flags }

import { Gds } from './Constants.js';

/** Prepend the 10-byte GDS header to `payload` and return the framed
 *  record ready to hand to the telnet layer (which will add IAC EOR). */
export function wrap (payload, opcode, flags = 0) {
    const body = payload ?? new Uint8Array(0);
    const total = Gds.HEADER_LEN + body.length;
    if (total > 0xFFFF)
        throw new RangeError(`5250 record too long: ${total} bytes`);

    const out = new Uint8Array(total);
    out[0] = (total >> 8) & 0xFF;
    out[1] =  total       & 0xFF;
    out[2] = Gds.TYPE_HI;
    out[3] = Gds.TYPE_LO;
    out[4] = 0x00;
    out[5] = 0x00;
    out[6] = Gds.VARHDR_LEN;
    out[7] = flags & 0xFF;
    out[8] = 0x00;
    out[9] = opcode & 0xFF;
    out.set(body, Gds.HEADER_LEN);
    return out;
}

/** Parse a record received from the host. Returns `{ opcode, flags,
 *  payload }` where `payload` is a subarray (zero-copy view) of the
 *  bytes after the header.  Returns null if the buffer is too short
 *  or doesn't look like a GDS record. */
export function unwrap (bytes) {
    if (bytes.length < Gds.HEADER_LEN) return null;
    if (bytes[2] !== Gds.TYPE_HI || bytes[3] !== Gds.TYPE_LO) return null;

    // Trust the variable-header length so a future host extension that
    // bumps it past 4 still parses correctly.
    const varHdr = bytes[6] | 0;
    const dataStart = 6 + varHdr;
    if (dataStart > bytes.length) return null;

    const flags  = bytes[7];
    const opcode = bytes[9];                  // opcode is always at offset 9
    // Bytes 4-5 carry `miscFlags1`+`miscFlags2`. The startup confirmation
    // record (PUB400 sends one immediately after telnet negotiation)
    // sets miscFlags1 = 0x80 (= startup confirmation) or 0x90
    // (= startup confirmation + diagnostics). The payload of those
    // records is the SNA/5250 session announcement (system name +
    // assigned device name) NOT a normal command stream — we surface
    // the flag so the Terminal can skip the parser dispatch.
    const miscFlags1 = bytes[4];
    const miscFlags2 = bytes[5];
    const payload = bytes.subarray(dataStart);
    return { opcode, flags, miscFlags1, miscFlags2, payload };
}
