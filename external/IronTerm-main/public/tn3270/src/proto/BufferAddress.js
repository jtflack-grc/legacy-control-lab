// 12 / 14 / 16-bit buffer-address codec.
//
// The wire format packs an addressable position into two bytes. The top
// two bits of byte 1 select the encoding scheme:
//   0b00xxxxxx  →  14-bit:  (b1 & 0x3F)<<8  | (b2 & 0xFF)
//   0b01xxxxxx  →  12-bit:  (b1 & 0x3F)<<6  | (b2 & 0x3F)   (lookup table)
//   0b10xxxxxx  →  reserved / 16-bit (when usable area says so)
//   0b11xxxxxx  →  12-bit:  (b1 & 0x3F)<<6  | (b2 & 0x3F)   (lookup table)
//
// We always *encode* using the 12-bit lookup-table form because every
// host accepts it and our largest model (43×80 = 3440 cells) fits in
// 12 bits.

const ADDRESS = (() => {
    const tbl = new Uint8Array(64);
    let value = 0x40;
    let ptr = 0;
    for (let i = 0; i < 4; i++) {
        tbl[ptr++] = value++;
        for (let j = 0; j < 9; j++) tbl[ptr++] = (value++ | 0x80) & 0xFF;
        for (let j = 0; j < 6; j++) tbl[ptr++] = value++;
    }
    // Two known fix-ups in the standard 12-bit address table.
    tbl[33] &= 0x7F;
    tbl[48] = (tbl[48] | 0x80) & 0xFF;
    return tbl;
})();

export class BufferAddress {
    /** Decode two wire bytes into an absolute screen position. */
    static decode (b1, b2) {
        const flag = b1 & 0xC0;
        if (flag === 0)
            return ((b1 & 0x3F) << 8) | (b2 & 0xFF);          // 14-bit
        return ((b1 & 0x3F) << 6) | (b2 & 0x3F);              // 12-bit
    }

    /** Encode `location` into two bytes using 12-bit table form. */
    static encode (location, out, offset) {
        out[offset]     = ADDRESS[(location >> 6) & 0x3F];
        out[offset + 1] = ADDRESS[location & 0x3F];
        return offset + 2;
    }
}
