// The 3270 presentation space.
//
// 3270 is a "structured" terminal: the screen is a flat array of cells,
// some of which are *attribute bytes* (the FA byte produced by SF/SFE)
// that govern every cell from there until the next attribute byte. Once
// the host has finished emitting orders the full attribute geometry can
// be recomputed by walking the buffer once and propagating the
// most-recent FA bytes / extended attributes from cell to cell.
//
// We store a Cell per buffer position (rows*cols of them). The drawing
// state (the "pen") lives directly on this class because there is only
// ever one and that simplifies orders that need to write a glyph and
// advance.

import { Attr, Hl } from '../proto/Constants.js';
import { Ebcdic } from '../../../shared/src/proto/Ebcdic.js';
import { Cell, decodeFA } from './Cell.js';

export class ScreenBuffer {
    /**
     * @param {number} rows
     * @param {number} cols
     * @param {Ebcdic} [ebcdic]  translator instance (defaults to CP037)
     */
    constructor (rows = 24, cols = 80, ebcdic = Ebcdic.get('CP037')) {
        this.rows = rows;
        this.cols = cols;
        this.size = rows * cols;
        this.ebcdic = ebcdic;
        this.cells = Array.from({ length: this.size }, () => new Cell());

        // Drawing state ("pen")
        this.position = 0;
        // Extended-attribute drawing context. SA orders mutate these and
        // they're applied to every glyph the pen lays down. EW / EWA reset
        // them to defaults.
        this.penFg = 0x00;
        this.penBg = 0x00;
        this.penHl = 0x00;

        // Cursor + status
        this.cursor = 0;
        this.keyboardLocked = true;
        this.alarm = false;
        this.formatted = false;        // becomes true once an SF/SFE is seen
        this.insertMode = false;       // toggled by the Insert key

        // Field index (rebuilt by recalcFields after each Write completes).
        this.fields = [];
    }

    resize (rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.size = rows * cols;
        this.cells = Array.from({ length: this.size }, () => new Cell());
        this.position = 0;
        this.cursor = 0;
        this.fields = [];
        this.formatted = false;
    }

    /** Switch to a different EBCDIC code page on the fly. Re-renders
     *  every existing cell's glyph from its stored byte so the screen
     *  immediately reflects the new mapping; no reconnect required.   */
    setEbcdic (ebcdic) {
        if (!ebcdic || this.ebcdic === ebcdic) return;
        this.ebcdic = ebcdic;
        for (const cell of this.cells) {
            if (!cell.startField && cell.byte !== 0x00)
                cell.glyph = this.ebcdic.toChar(cell.byte);
        }
    }

    // ---- Pen primitives ------------------------------------------------

    moveTo (loc) {
        this.position = ((loc % this.size) + this.size) % this.size;
    }
    moveRight () {
        this.position = (this.position + 1) % this.size;
    }
    moveLeft () {
        this.position = (this.position - 1 + this.size) % this.size;
    }

    /** Lay down an FA byte at the current pen position. */
    startField (faByte) {
        const cell = this.cells[this.position];
        cell.reset();
        cell.startField = true;
        cell.byte = faByte & 0xFF;
        cell.fa = decodeFA(faByte);
        cell.glyph = ' ';
        this.formatted = true;
    }

    /** Modify Field - update an existing FA cell at the pen position
     *  with new attribute pairs. Used by the MF order. The FA byte
     *  itself is replaced when the pair carries XA_START_FIELD (0xC0);
     *  extended-attribute codes (0x41/0x42/0x45) update the FA cell's
     *  per-field attrs that recalcFields propagates to content. */
    modifyFieldAttribute (code, value) {
        const cell = this.cells[this.position];
        if (!cell.startField) return;
        if (code === 0xC0) {
            cell.byte = value & 0xFF;
            cell.fa = decodeFA(value);
        } else if (code === 0x42) cell.foreground = value & 0xFF;
        else   if (code === 0x45) cell.background = value & 0xFF;
        else   if (code === 0x41) cell.highlight  = value & 0xFF;
        // CHARSET / VALIDATION / OUTLINING / TRANSPARENCY / RESET - accepted
        // but not visually represented.
    }

    /** Erase from the current pen position up to (but not including) the
     *  next FA byte. Used when Program Tab follows text - per the IBM
     *  spec, PT after a text order erases the rest of the field. */
    eraseToNextField () {
        let p = this.position;
        let safety = this.size + 1;
        while (safety-- > 0) {
            const c = this.cells[p];
            if (c.startField) break;
            c.byte = 0x00;
            c.glyph = ' ';
            p = (p + 1) % this.size;
        }
    }

    /** Erase from the current cursor to the end of the field whose FA
     *  is at `fieldStart`. Stops at the next FA byte, or if the cursor
     *  has already auto-skipped into a different field. Equivalent of
     *  the 3278's "Erase EOF" key (PF5/End) - useful after typing a
     *  fresh command into a field that may already contain leftover
     *  characters from a previous keystroke session.                  */
    eraseFromCursorToFieldEnd (fieldStart) {
        let p = this.cursor;
        let safety = this.size + 1;
        while (safety-- > 0) {
            const cell = this.cells[p];
            if (cell.startField) break;
            const f = this.fieldAt(p);
            if (!f || f.start !== fieldStart) break;
            cell.byte = 0x00;
            cell.glyph = ' ';
            p = (p + 1) % this.size;
        }
    }

    /** Set an extended attribute on the cell that's about to be written
     *  (or, when called immediately after SF/SFE, on the field itself).  */
    setPenAttribute (code, value) {
        switch (code) {
            case Attr.XA_FOREGROUND:   this.penFg = value & 0xFF; break;
            case Attr.XA_BACKGROUND:   this.penBg = value & 0xFF; break;
            case Attr.XA_HIGHLIGHTING: this.penHl = value & 0xFF; break;
            case Attr.XA_RESET:
                this.penFg = 0; this.penBg = 0; this.penHl = 0;
                break;
            // CHARSET / VALIDATION / OUTLINING / TRANSPARENCY: accepted but
            // not rendered.
        }
    }

    /** Write one EBCDIC byte at the pen, advance one cell. */
    write (ebcdicByte) {
        const cell = this.cells[this.position];
        cell.reset();
        cell.byte  = ebcdicByte & 0xFF;
        cell.glyph = this.ebcdic.toChar(ebcdicByte);
        cell.foreground = this.penFg;
        cell.background = this.penBg;
        cell.highlight  = this.penHl;
        this.moveRight();
    }

    /** Pen state reset - called by EraseWrite / EraseWriteAlternate. */
    resetPen () {
        this.position = 0;
        this.penFg = 0;
        this.penBg = 0;
        this.penHl = 0;
    }

    /** Wipe every cell back to nulls. */
    clearScreen () {
        for (const cell of this.cells)
            cell.reset();
        this.position = 0;
        this.formatted = false;
        this.fields = [];
    }

    /** Erase All Unprotected - preserves protected cells, blanks the rest
     *  and resets MDT on every unprotected field. The cursor goes to the
     *  start of the first unprotected field (or address 0 if none). */
    eraseAllUnprotected () {
        // Walk after recalc so we know which cells are protected.
        this.recalcFields();
        for (let i = 0; i < this.size; i++) {
            const c = this.cells[i];
            if (c.startField) {
                if (c.fa && !c.fa.protected) {
                    c.fa.modified = false;
                    c.byte = (c.byte & ~0x01) & 0xFF;
                }
            } else if (!c.protected) {
                c.byte = 0x00;
                c.glyph = ' ';
                c.modified = false;
            }
        }
        const target = this.fields.find(f => !f.protected);
        this.cursor = target ? (target.start + 1) % this.size : 0;
    }

    // ---- Field index ---------------------------------------------------

    /** Rebuild the field list and propagate FA-derived attributes to every
     *  cell. Called once after a Write batch completes. */
    recalcFields () {
        this.fields = [];
        if (!this.formatted) return;

        // Find the FA that "covers" position 0 - that's the last FA in
        // the buffer (3270 buffers wrap).
        const faIndices = [];
        for (let i = 0; i < this.size; i++)
            if (this.cells[i].startField) faIndices.push(i);
        if (faIndices.length === 0) {
            this.formatted = false;
            return;
        }

        for (let k = 0; k < faIndices.length; k++) {
            const start = faIndices[k];
            const next  = faIndices[(k + 1) % faIndices.length];
            const length = (next - start + this.size) % this.size;
            const faCell = this.cells[start];
            const fa = faCell.fa;
            this.fields.push({
                start,
                length,             // includes the FA cell itself
                contentStart: (start + 1) % this.size,
                contentLength: length - 1,
                protected: fa.protected,
                numeric:   fa.numeric,
                hidden:    fa.hidden,
                intensified: fa.intensified,
                modified:  fa.modified,
                validation: faCell.validation || 0,
                fa,
                attrs: {
                    foreground: faCell.foreground,
                    background: faCell.background,
                    highlight:  faCell.highlight,
                },
            });
        }

        // Propagate every field's flags to its content cells. Cells already
        // carry their own extended attributes from SA orders; we only
        // overwrite those when the cell didn't get an explicit value.
        for (const f of this.fields) {
            for (let n = 1; n < f.length; n++) {
                const idx = (f.start + n) % this.size;
                const c = this.cells[idx];
                if (c.startField) break;     // safety
                c.protected   = f.protected;
                c.hidden      = f.hidden;
                c.intensified = f.intensified;
                c.numeric     = f.numeric;
                c.modified    = f.modified;
                if (c.foreground === 0) c.foreground = f.attrs.foreground;
                if (c.background === 0) c.background = f.attrs.background;
                if (c.highlight  === 0) c.highlight  = f.attrs.highlight;
            }
        }
    }

    /** WCC: reset MDT bit on every field. */
    resetAllMdt () {
        for (const c of this.cells) {
            if (c.startField && c.fa) {
                c.fa.modified = false;
                c.byte = (c.byte & ~0x01) & 0xFF;
            }
            c.modified = false;
        }
        for (const f of this.fields) f.modified = false;
    }

    // ---- Field navigation ---------------------------------------------

    /** Find the field containing `addr` (3270 buffers wrap, so a field
     *  near the end can extend through 0). Returns null when unformatted. */
    fieldAt (addr) {
        if (!this.formatted) return null;
        for (const f of this.fields) {
            const end = (f.start + f.length) % this.size;
            if (f.start <= end) {
                if (addr >= f.start && addr < end) return f;
            } else {
                if (addr >= f.start || addr < end) return f;
            }
        }
        return null;
    }

    /** Next unprotected field whose start > `addr` (cyclic). */
    nextUnprotectedAfter (addr) {
        if (!this.formatted) return null;
        // Sort once relative to the cursor to find the next one cyclically.
        const ordered = [...this.fields].sort((a, b) => a.start - b.start);
        for (const f of ordered)
            if (!f.protected && f.start > addr) return f;
        for (const f of ordered)
            if (!f.protected) return f;
        return null;
    }

    /** Validate every unprotected field that has a Validation attribute
     *  set, before the AID goes out. Mandatory-fill (0x80) needs every
     *  cell non-null; mandatory-entry (0x40) needs at least one cell
     *  non-null. Returns the offending field + reason, or null when ok.
     *
     *  PA / Clear are short-read AIDs (don't transmit field data) so
     *  validation is bypassed for them - same convention real 3278s use.
     */
    validateForAid (aidByte) {
        // Short-read AIDs (PA1, PA2, PA3, Clear) - don't transmit fields,
        // so validation doesn't apply. Inlined to avoid an import cycle.
        if (aidByte === 0x6C || aidByte === 0x6E || aidByte === 0x6B || aidByte === 0x6D)
            return null;
        for (const f of this.fields) {
            if (f.protected || !f.validation) continue;
            const fillReq  = (f.validation & 0x80) !== 0;
            const entryReq = (f.validation & 0x40) !== 0;
            if (!fillReq && !entryReq) continue;
            let nonNull = 0;
            let nulls = 0;
            for (let n = 1; n < f.length; n++) {
                const c = this.cells[(f.start + n) % this.size];
                if (c.startField) break;
                if (c.byte === 0x00) nulls++; else nonNull++;
            }
            if (entryReq && nonNull === 0)
                return { field: f, reason: 'mandatory entry' };
            if (fillReq && nulls > 0)
                return { field: f, reason: 'mandatory fill' };
        }
        return null;
    }

    // ---- User input ----------------------------------------------------

    /** Type one EBCDIC byte at the cursor inside an unprotected field.
     *  Sets the field's MDT, advances the cursor, and skips over the next
     *  FA byte if we're at the end of the field. Returns true on success.
     *  In insert mode, shifts the rest of the field one cell to the right;
     *  if the trailing cell is non-null the operation is refused (the
     *  field is full) and we beep. */
    typeByte (ebcdic) {
        const field = this.fieldAt(this.cursor);
        if (!field || field.protected) return false;
        if (this.cursor === field.start) return false;     // can't type onto FA

        if (this.insertMode) {
            // Walk from cursor up to the cell just before the next FA;
            // if the last cell is non-null we'd push data out of the field
            // - refuse (host expects field-bounded inserts).
            let last = this.cursor;
            for (let n = 1; n < field.length; n++) {
                const idx = (this.cursor + n) % this.size;
                if (this.cells[idx].startField) break;
                last = idx;
            }
            const tail = this.cells[last];
            if (tail.byte !== 0x00) {
                this.alarm = true;          // beep - no room
                return false;
            }
            // Shift right one cell from `last` back to `cursor`.
            for (let p = last; p !== this.cursor; ) {
                const prev = (p - 1 + this.size) % this.size;
                const dst = this.cells[p];
                const src = this.cells[prev];
                dst.byte       = src.byte;
                dst.glyph      = src.glyph;
                dst.foreground = src.foreground;
                dst.background = src.background;
                dst.highlight  = src.highlight;
                p = prev;
            }
        }

        const cell = this.cells[this.cursor];
        cell.byte = ebcdic & 0xFF;
        cell.glyph = this.ebcdic.toChar(ebcdic);
        cell.modified = true;
        // Set MDT on the field
        const fa = this.cells[field.start];
        if (fa.fa) {
            fa.fa.modified = true;
            fa.byte = (fa.byte | 0x01) & 0xFF;
        }
        field.modified = true;
        let next = (this.cursor + 1) % this.size;
        // Auto-skip protected fields (and the FA byte that introduces them).
        if (this.cells[next].startField) {
            const nf = this.fieldAt((next + 1) % this.size);
            if (nf && nf.protected) {
                const u = this.nextUnprotectedAfter(next);
                next = u ? (u.start + 1) % this.size : next;
            } else {
                next = (next + 1) % this.size;
            }
        }
        this.cursor = next;
        return true;
    }

    /** Toggle insert mode. Returns the new state. */
    toggleInsert () {
        this.insertMode = !this.insertMode;
        return this.insertMode;
    }

    /** Backspace inside an unprotected field - moves the cursor and
     *  erases the character to the left (destructive). */
    backspace () {
        const field = this.fieldAt(this.cursor);
        if (!field || field.protected) return;
        let prev = (this.cursor - 1 + this.size) % this.size;
        if (prev === field.start) return;     // can't go onto FA byte
        // Destructive backspace - erases the cell to the left and moves
        // the cursor there. Matches what users expect on a modern keyboard.
        const cell = this.cells[prev];
        cell.byte = 0x00;
        cell.glyph = ' ';
        cell.modified = true;
        const fa = this.cells[field.start];
        if (fa.fa) {
            fa.fa.modified = true;
            fa.byte = (fa.byte | 0x01) & 0xFF;
        }
        field.modified = true;
        this.cursor = prev;
    }

    /** Tab to next unprotected field. */
    tab () {
        const f = this.nextUnprotectedAfter(this.cursor);
        if (f) this.cursor = (f.start + 1) % this.size;
    }
}
