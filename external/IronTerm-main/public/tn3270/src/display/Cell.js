// One presentation-space cell + the FA decoder.
//
// 3270 buffers store a Cell per buffer position. Some cells are field-
// attribute cells (the FA byte produced by SF/SFE) and govern every
// following cell until the next FA byte. The decoder returns the
// resolved flags for a given FA byte.

/** Decode the 6 packed bits of a Field Attribute byte (the FA, sometimes
 *  called the "Start Field Attribute"). Bit 7 is the MDT, bit 5 is the
 *  "protected" flag, etc. - all per the SNA reference. */
export function decodeFA (b) {
    const display = (b & 0x0C) >> 2;
    return {
        protected:    (b & 0x20) !== 0,
        numeric:      (b & 0x10) !== 0,
        modified:     (b & 0x01) !== 0,
        intensified:  display === 2,
        hidden:       display === 3,
        detectable:   display === 1 || display === 2,
        raw: b & 0xFF,
    };
}

export class Cell {
    constructor () {
        this.byte        = 0x00;     // EBCDIC value (or FA-byte if startField)
        this.glyph       = ' ';      // resolved unicode glyph
        this.startField  = false;
        this.fa          = null;     // decoded FA (only when startField=true)
        // Extended-attribute snapshot for this cell. For non-FA cells this
        // is rebuilt from the field's FA + any SA orders during recalc.
        this.foreground  = 0x00;     // 0xF1..0xFF if extended, 0 = base
        this.background  = 0x00;
        this.highlight   = 0x00;     // Hl.* values
        // Validation byte (XA_VALIDATION = 0xC1) - only meaningful on FA
        // cells. Bits: 0x80 mandatory-fill, 0x40 mandatory-entry,
        // 0x20 trigger.
        this.validation  = 0x00;
        // Convenience copies of FA-derived flags so the renderer doesn't
        // have to walk back to the field on every paint.
        this.protected   = true;
        this.hidden      = false;
        this.intensified = false;
        this.numeric     = false;
        // Whether this cell belongs to a modified field (mirrors the FA
        // MDT bit after a field has been changed by the user).
        this.modified    = false;
    }

    reset () {
        this.byte = 0x00;
        this.glyph = ' ';
        this.startField = false;
        this.fa = null;
        this.foreground = 0x00;
        this.background = 0x00;
        this.highlight = 0x00;
        this.validation = 0x00;
        this.protected = true;
        this.hidden = false;
        this.intensified = false;
        this.numeric = false;
        this.modified = false;
    }
}
