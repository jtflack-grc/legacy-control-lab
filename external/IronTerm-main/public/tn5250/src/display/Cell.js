// One presentation-space cell for the 5250 buffer.
//
// On the 5250 the attribute byte (0x20-0x3F range) sits inline in the
// buffer as a non-display cell; every following cell inherits that
// attribute until the next attribute byte. Cells are also tagged with
// a back-reference to their field (populated by ScreenBuffer.addField).

import { ATTR_BASE } from '../proto/Constants.js';

const DEFAULT_ATTR_BYTE = 0x20;
const DEFAULT_ATTR_DESC = ATTR_BASE[DEFAULT_ATTR_BYTE];

export { DEFAULT_ATTR_BYTE, DEFAULT_ATTR_DESC };

export class Cell {
    constructor () {
        this.byte = 0x00;                 // EBCDIC value (or attr byte if attributePlace)
        this.glyph = ' ';                 // resolved unicode glyph
        this.attributePlace = false;      // true on cells holding an attribute byte
        this.attr = DEFAULT_ATTR_DESC;    // active attribute descriptor (from ATTR_BASE)
        // Field bookkeeping - resolved during walkFields().
        this.field = null;                // back-reference for input handling
        this.startField = false;          // true on the cell that opens a field (= attribute byte)
        // Extended attribute (Write Extended Attribute) pen, if any.
        // null when the cell uses only the basic attribute pen.
        this.extAttr = null;
    }

    reset () {
        this.byte = 0x00;
        this.glyph = ' ';
        this.attributePlace = false;
        this.attr = DEFAULT_ATTR_DESC;
        this.field = null;
        this.startField = false;
        this.extAttr = null;
    }
}
