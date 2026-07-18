// 5250 presentation space.
//
// The 5250 model is similar to 3270 but with several important
// differences:
//
//   • Attributes are bytes in the 0x20-0x3F range placed anywhere in
//     the buffer. Each one occupies a non-display cell and governs
//     every following cell until the next attribute byte.
//   • Field formatting is described per-field by a Field Format Word
//     (FFW) plus optional Field Control Words (FCWs); SF orders carry
//     these alongside the visual attribute byte that opens the field.
//   • Fields are normally re-described from scratch on every WTD;
//     a Clear Format Table command erases the field set without
//     touching the visible cells (used by some apps before refresh).
//   • There's a saved/restored screen pair (SAVE/RESTORE opcodes) so
//     pop-up help and window-style UIs can stack.
//
// We keep the model deliberately small for Phase 2: enough state to
// drive the renderer, accept user input into the right fields, and
// emit a correct AID response. Niceties (DUP, FIELD-EXIT semantics,
// signed-numeric padding, double-byte runs) come in Phase 2b.

import { Ebcdic } from '../../../shared/src/proto/Ebcdic.js';
import { ATTR_BASE, isAttribute, Ffw, Shift, Adjust } from '../proto/Constants.js';
import { EnptuiStore } from '../proto/enptui/Store.js';
import { Cell, DEFAULT_ATTR_BYTE, DEFAULT_ATTR_DESC } from './Cell.js';
import { acceptsByShift, isEbcdicDigit, isEbcdicLetter, EBC_SPACE, EBC_DIGITS_MIN } from './shift-rules.js';
import { debugFor } from '../../../shared/src/core/debug.js';

const debug = debugFor('tn5250.screen');

// Re-exported so existing consumers that imported these from ScreenBuffer
// keep working without an edit.
export { isEbcdicDigit, isEbcdicLetter, EBC_SPACE, EBC_DIGITS_MIN };

class Field {
    /** Build from the byte stream the host sent in an SF order. */
    constructor (start, opts) {
        this.start  = start;           // index of the attribute byte that opens the field
        this.length = opts.length;     // data-cell count (excludes the attribute cell)
        this.attr   = opts.attr;       // basic attribute byte (0x20-0x3F)
        this.ffw0   = opts.ffw0 ?? 0;  // first FFW byte
        this.ffw1   = opts.ffw1 ?? 0;  // second FFW byte
        this.fcws   = opts.fcws ?? [];

        // FFW byte 0 — bypass/dup/mdt/shift
        this.bypass   = (this.ffw0 & Ffw.BYPASS)      !== 0;
        this.dup      = (this.ffw0 & Ffw.DUP_ALLOWED) !== 0;
        this.modified = (this.ffw0 & Ffw.MDT)         !== 0;
        this.shift    =  this.ffw0 & Ffw.SHIFT_NUMERIC;

        // FFW byte 1 — input semantics enforced at typeByte / submit time
        this.autoEnter = (this.ffw1 & Ffw.AUTO_ENTER) !== 0;
        this.fer       = (this.ffw1 & Ffw.FER)        !== 0;
        this.monocase  = (this.ffw1 & Ffw.MONOCASE)   !== 0;
        this.mandatory = (this.ffw1 & Ffw.MANDATORY)  !== 0;
        this.adjust    =  this.ffw1 & Ffw.ADJUST;

        // FCW (Field Control Word) pairs - tag bytes and their values
        // following the FFW. We pick out the three that affect runtime
        // behaviour; everything else stays in this.fcws for inspection.
        //   0x86 = continued edit field (value 1=first, 2=last, 3=mid)
        //   0x88 = cursor progression order (target field id)
        //   0x89 = highlight-on-entry attribute byte
        // Other FCW tags (0x80/0x81 right-to-left, 0x82 magnetic stripe,
        // 0x84 self-check, 0x85 transparency, 0xB1-0xBF display attrs)
        // are not interpreted but stay available via this.fcws.
        this.continuedKind   = 0;
        this.cursorProgress  = 0;
        this.highlightAttr   = 0;
        for (const [tag, val] of this.fcws) {
            if      (tag === 0x86) this.continuedKind  = val;
            else if (tag === 0x88) this.cursorProgress = val;
            else if (tag === 0x89) this.highlightAttr  = val;
        }
        this.continued      = this.continuedKind !== 0;
        this.continuedFirst = this.continuedKind === 1;
        this.continuedLast  = this.continuedKind === 2;
        this.continuedMid   = this.continuedKind === 3;
    }
}

export class ScreenBuffer {
    /**
     * @param {number} rows
     * @param {number} cols
     * @param {Ebcdic} [ebcdic] code-page table (CP037 by default)
     */
    constructor (rows, cols, ebcdic) {
        this.rows = rows;
        this.cols = cols;
        this.ebcdic = ebcdic ?? Ebcdic.get('CP037');

        this.cells = new Array(rows * cols);
        for (let i = 0; i < this.cells.length; i++) this.cells[i] = new Cell();

        this.cursor = 0;                  // index 0..size-1
        this.fields = [];                 // ordered by start position
        this.keyboardLocked = true;       // unlocked by an unlock-keyboard CC1
        this.messageLight = false;
        this.alarm = false;
        this.insertMode = false;

        // SAVE/RESTORE stack - shallow snapshots.
        this.savedCells = null;
        this.savedFields = null;

        // After WTD orders are processed, IC sets `pendingCursor`; the
        // renderer reads it when it next paints.
        this.pendingCursor = -1;

        // Running attribute "pen" - every attribute byte (0x20-0x3F)
        // emitted by the host sets this, and every subsequent data
        // byte / RA fill picks it up so the colour propagates through
        // the screen exactly like IBM hardware. SBA does NOT reset it
        // (per IBM 5250 ref); only a fresh Clear Unit does.
        this.activeAttr = DEFAULT_ATTR_DESC;

        // ENPTUI constructs (windows, selection fields, push buttons,
        // menu bars, scroll bars). The InboundParser populates this
        // from WTDSF segments; the Renderer paints them as overlays.
        this.enptui = new EnptuiStore();

        // Extended attribute "pen" set by WEA (Write Extended Attribute)
        // orders. Reset to null whenever the basic attribute pen
        // (0x20-0x3F) changes, mirroring real IBM 5250 hardware: WEA
        // augments the current basic attribute but is wiped the moment
        // the host emits another attribute place.
        this.extendedAttr = null;

        // Start-of-Header state. The host emits an SOH order per WTD
        // command (when controls are present); we keep the last one so
        // sendAid() can refuse disabled PF keys and the renderer can
        // colour the error line correctly. Default = all zeros, which
        // (per the bit-is-DISABLE wire format) means every PF enabled.
        this.soh = {
            resetMdt: false,
            errRow: 0,
            pfBytes: [0x00, 0x00, 0x00],
        };
    }

    get size () { return this.rows * this.cols; }

    setEbcdic (ebcdic) {
        this.ebcdic = ebcdic;
        for (const cell of this.cells)
            cell.glyph = cell.attributePlace ? ' ' : this.ebcdic.toChar(cell.byte);
    }

    resize (rows, cols) {
        if (rows === this.rows && cols === this.cols) return;
        this.rows = rows;
        this.cols = cols;
        this.cells = new Array(rows * cols);
        for (let i = 0; i < this.cells.length; i++) this.cells[i] = new Cell();
        this.cursor = 0;
        this.fields = [];
    }

    // ---- mutation API used by the parser ------------------------------

    clearUnit () {
        for (const cell of this.cells) cell.reset();
        this.fields = [];
        this.cursor = 0;
        this.messageLight = false;
        this.alarm = false;
        this.sysreqMode = false;
        this.errorMode = false;
        this.errorHelpMode = false;
        this.activeAttr = DEFAULT_ATTR_DESC;
        this.extendedAttr = null;
        // Clear Unit also wipes every active GUI construct - the host
        // is starting over with the screen, so windows/selections that
        // belonged to the previous panel don't carry over.
        this.enptui.clear();
        // Seed position 0 with a default green-normal attribute place so
        // the first WTD has a valid running pen before any host SF or
        // attribute byte.
        const c0 = this.cells[0];
        c0.byte = DEFAULT_ATTR_BYTE;
        c0.attributePlace = true;
        c0.attr = DEFAULT_ATTR_DESC;
        c0.glyph = ' ';
    }
    clearFormatTable () { this.fields = []; this.recalcAttributes(); }
    saveScreen ()       { this.savedCells = this.cells.map(c => ({ ...c })); this.savedFields = [...this.fields]; }
    restoreScreen ()    {
        if (!this.savedCells) return;
        this.cells = this.savedCells.map(o => Object.assign(new Cell(), o));
        this.fields = [...this.savedFields];
        this.recalcAttributes();
    }

    /** Record the latest SOH order's bookkeeping bits. The flag1 reset-
     *  MDT bit is applied immediately; the PF mask + error row are
     *  stashed for sendAid() and the renderer. */
    startOfHeader (opts = {}) {
        if (opts.resetMdt) this.resetMdtFlags();
        this.soh = {
            resetMdt: !!opts.resetMdt,
            errRow:   opts.errRow  ?? 0,
            pfBytes:  opts.pfBytes ?? [0x00, 0x00, 0x00],
        };
    }

    /** Returns true when PFn (1..24) is enabled by the latest SOH
     *  pf-mask. The wire bytes are DISABLE masks per the IBM 5250
     *  reference (bit set ⇒ "no data included" for that PF, i.e. host
     *  refuses the key). Layout:
     *    pfBytes[0] = PF1 (0x80) … PF8 (0x01)
     *    pfBytes[1] = PF9 (0x80) … PF16(0x01)
     *    pfBytes[2] = PF17(0x80) … PF24(0x01)
     *  Default when no SOH was seen: all-zero (= all keys enabled). */
    isPfEnabled (n) {
        if (n < 1 || n > 24) return true;
        const byteIdx = ((n - 1) / 8) | 0;
        const bit     = 7 - ((n - 1) % 8);
        return (this.soh.pfBytes[byteIdx] & (1 << bit)) === 0;
    }

    /** Apply a WEA (Write Extended Attribute) pair to the running pen.
     *  Type bytes per IBM 5250 ref: 0x01 = foreground colour, 0x02 =
     *  field/character highlight (underscore/reverse/blink), 0x05 =
     *  transparency. We store the (type, value) pair on `extendedAttr`;
     *  follow-up placeByte / repeatToAddress / addField calls inherit
     *  it, and any new basic attribute byte clears it. */
    setExtendedAttr (type, value) {
        this.extendedAttr = { type, value };
    }

    /** Plain EBCDIC data byte from the WTD stream: write at cursor,
     *  inherit the active attribute pen, and advance. Attribute cells
     *  are non-display so we step over them defensively. */
    placeByte (b) {
        const cell = this.cells[this.cursor];
        if (cell.attributePlace) {
            this.#advance();
            return this.placeByte(b);
        }
        cell.byte = b;
        cell.glyph = this.ebcdic.toChar(b);
        cell.attributePlace = false;
        cell.startField = false;
        cell.attr = this.activeAttr;          // running pen
        cell.extAttr = this.extendedAttr;     // inherit WEA pen, may be null
        this.#advance();
    }

    /** A 0x20-0x3F byte in the WTD stream marks an attribute place: the
     *  byte is stored, that cell becomes non-display, the running pen
     *  is updated, and we advance. Any pending WEA extension is dropped
     *  - a basic attribute resets the extended pen, per IBM 5250 ref.
     *
     *  Note: no eager forward propagation here. The full attribute
     *  inheritance pass runs once per WTD record via recalcAttributes()
     *  (called from InboundParser at WTD end). That centralised walk
     *  correctly handles all orderings of SF / placeAttribute / RA /
     *  EA, including SF orders that arrive AFTER a placeAttribute (the
     *  case where eager propagation would leave stale attr values on
     *  cells that should have inherited the SF's attribute byte). */
    placeAttribute (b) {
        const cell = this.cells[this.cursor];
        const desc = ATTR_BASE[b] ?? DEFAULT_ATTR_DESC;
        cell.byte = b;
        cell.attributePlace = true;
        // Do NOT set startField here - that flag is reserved for SF
        // order attribute places (see addField). Setting it on every
        // inline attribute byte would create spurious field boundaries
        // for nullModifiedFields() and friends.
        cell.attr = desc;
        cell.glyph = ' ';
        cell.extAttr = null;
        this.activeAttr   = desc;             // pen update
        this.extendedAttr = null;             // drop WEA pen
        this.#advance();
    }

    repeatToAddress (row, col, byte) {
        const target = this.#index(row, col);
        const filler = byte & 0xFF;
        const fillGlyph = filler >= 0x40 ? this.ebcdic.toChar(filler) : ' ';
        const fillerIsAttr = isAttribute(filler);
        const fillerAttr   = fillerIsAttr ? (ATTR_BASE[filler] ?? DEFAULT_ATTR_DESC) : null;

        let i = this.cursor;
        const limit = this.size * 2;
        for (let n = 0; n < limit; n++) {
            if (i === target) break;
            const cell = this.cells[i];
            if (fillerIsAttr) {
                cell.byte = filler;
                cell.attributePlace = true;
                // startField stays FALSE - RA-with-attribute creates an
                // inline attribute place at every filled cell, not an
                // SF field boundary. Setting startField here was the
                // same bug as placeAttribute used to have: it would
                // trick nullModifiedFields() and recalcAttributes()
                // into treating the cell as a field start.
                cell.attr = fillerAttr;
                cell.glyph = ' ';
                this.activeAttr = fillerAttr;
            } else if (!cell.attributePlace) {
                cell.byte = filler;
                cell.glyph = fillGlyph;
                cell.attr = this.activeAttr;       // inherit running pen
            }
            i = (i + 1) % this.size;
        }
        this.cursor = target;
    }

    eraseToAddress (row, col) {
        const target = this.#index(row, col);
        let i = this.cursor;
        const limit = this.size * 2;
        for (let n = 0; n < limit; n++) {
            if (i === target) break;
            const cell = this.cells[i];
            if (!cell.attributePlace) {
                cell.byte = 0x00;
                cell.glyph = ' ';
            }
            i = (i + 1) % this.size;
        }
        this.cursor = target;
    }

    setCursor (row, col) { this.cursor = this.#index(row, col); }
    setPendingInsert (insertMode, row, col) {
        this.pendingCursor = this.#index(row, col);
        if (insertMode) this.insertMode = true;
    }

    addField ({ attr, length, ffw0, ffw1, fcws }) {
        // SF order layout per IBM 5250 Functions Reference §3:
        //
        //     0x1D <FFW0> [<FFW1> <FCW pairs>...] <attr> <length-hi> <length-lo>
        //
        // The `length` field is **the number of data character positions,
        // EXCLUSIVE of the leading attribute byte**. So `length=2` means
        // 1 attribute cell + 2 data cells (total 3 cells on screen).
        // Confirmed against pub400's PDM Opt field (length=2, accepts
        // 2-digit options like 14, 15, 24) and Library field (length=10,
        // shows "BENCZ1" + 4 nulls in the dump).
        //
        // We follow the IBM convention: `length` is the count of data
        // cells exclusive of the leading attribute byte.
        const start = this.cursor;
        const desc  = ATTR_BASE[attr] ?? DEFAULT_ATTR_DESC;
        const field = new Field(start, { length, attr, ffw0, ffw1, fcws });
        this.fields.push(field);

        const attrCell = this.cells[start];
        attrCell.byte = attr;
        attrCell.attributePlace = true;
        attrCell.startField = true;
        attrCell.attr = desc;
        attrCell.glyph = ' ';
        // Tag the attr cell with the field reference too. fieldAt()
        // still uses the `idx > f.start` test so the attr cell isn't
        // considered "inside" the field for input purposes, but
        // recalcAttributes() needs cell.field to identify SF starts
        // and skip past the field's data cells.
        attrCell.field = field;

        // Force-overwrite every data cell that belongs to this field.
        // The host can re-WTD without a Clear Unit in between, leaving
        // stale `attributePlace` flags from a previous SF in our cells;
        // honouring those flags would make the new field end early.
        // We DO NOT extend beyond the field's last data cell - cells at
        // positions > start+length are managed by the global attribute
        // inheritance pass (recalcAttributes) once per record.
        for (let i = 1; i <= length; i++) {
            const idx = (start + i) % this.size;
            const c = this.cells[idx];
            c.attributePlace = false;
            c.startField     = false;
            c.attr           = desc;
            c.field          = field;
        }

        this.activeAttr = desc;
        this.#advance();
    }

    resetMdtFlags () {
        for (const f of this.fields) f.modified = false;
    }

    nullModifiedFields () {
        for (const f of this.fields) {
            if (!f.modified || f.bypass) continue;
            // Iterate the field's `f.length` data cells (data starts at
            // f.start + 1 and runs for f.length positions).
            for (let n = 1; n <= f.length; n++) {
                const idx = (f.start + n) % this.size;
                const cell = this.cells[idx];
                if (cell.startField) break;
                cell.byte = 0x00;
                cell.glyph = ' ';
            }
        }
    }

    roll (top, bottom, distance, up) {
        // Inclusive row range, 1-based.
        if (distance <= 0) return;
        const t = (top - 1) | 0;
        const b = (bottom - 1) | 0;
        if (t < 0 || b >= this.rows || b < t) return;
        const span = b - t + 1;
        const d = distance % span;
        const tmp = [];
        for (let r = t; r <= b; r++)
            tmp.push(this.cells.slice(r * this.cols, (r + 1) * this.cols));
        const rotated = up
            ? [...tmp.slice(d), ...tmp.slice(0, d)]
            : [...tmp.slice(span - d), ...tmp.slice(0, span - d)];
        for (let r = t; r <= b; r++) {
            const row = rotated[r - t];
            for (let c = 0; c < this.cols; c++)
                this.cells[r * this.cols + c] = row[c];
        }
    }

    // ---- input (user typing) -------------------------------------------

    /** Find the field that contains absolute buffer index `idx`.
     *  Field occupies `f.start` (attribute cell) + `f.length` data
     *  cells, so the data range is (f.start, f.start + f.length]. */
    fieldAt (idx) {
        for (const f of this.fields) {
            const end = (f.start + f.length + 1) % this.size;
            if (f.start < end) {
                if (idx > f.start && idx < end) return f;
            } else {
                if (idx > f.start || idx < end) return f;
            }
        }
        return null;
    }

    /** Type one EBCDIC byte at the current cursor. Returns true if it
     *  was accepted (we were inside an unprotected, non-bypass field). */
    typeByte (b) {
        const here = this.cursor;
        const cell = this.cells[here];
        const f = this.fieldAt(here);
        const r = (here / this.cols | 0) + 1;
        const c = (here % this.cols) + 1;
        if (!f) {
            debug.warn(`typeByte FAIL at idx=${here} (r${r},c${c}): no field; ` +
                `cell.attributePlace=${cell.attributePlace} cell.field=${cell.field ? 'set' : 'null'}`);
            return false;
        }
        if (f.bypass) {
            debug.warn(`typeByte FAIL at idx=${here} (r${r},c${c}): field is bypass; ` +
                `field.start=${f.start} field.length=${f.length} ffw0=0x${f.ffw0.toString(16)}`);
            return false;
        }
        if (cell.attributePlace) {
            debug.warn(`typeByte FAIL at idx=${here} (r${r},c${c}): cell is attributePlace; ` +
                `field.start=${f.start} field.length=${f.length}`);
            return false;
        }
        // Monocase fields (FFW byte 2 bit 0x20) force typed lowercase
        // letters to their uppercase EBCDIC equivalent before storing,
        // matching the IBM 5250 reference.
        // CP037/CP1047 share the lowercase a-i = 0x81-0x89, j-r =
        // 0x91-0x99, s-z = 0xA2-0xA9; uppercase counterparts are
        // 0xC1-0xC9, 0xD1-0xD9, 0xE2-0xE9. Adding 0x40 maps each block.
        if (f.monocase) {
            if      (b >= 0x81 && b <= 0x89) b += 0x40;
            else if (b >= 0x91 && b <= 0x99) b += 0x40;
            else if (b >= 0xA2 && b <= 0xA9) b += 0x40;
        }

        // Shift enforcement. Real 5250 hardware refuses keys that don't
        // match the field's data-shift specification (FFW byte 0, low
        // nibble). Reject early so the host never sees, e.g., letters
        // in a digits-only field.
        if (!acceptsByShift(b, f.shift)) {
            debug.warn(`typeByte FAIL: byte 0x${b.toString(16)} rejected by shift=${f.shift}`);
            return false;
        }

        cell.byte = b;
        cell.glyph = this.ebcdic.toChar(b);
        // Don't touch cell.attr - it was set by the field's SF and the
        // running pen would inherit it from the field's start attribute
        // anyway.
        f.modified = true;
        this.#advance();
        return true;
    }

    /** Find the next unprotected non-bypass field whose start > `addr`
     *  (cyclic). Used by Tab navigation. */
    nextInputAfter (addr) {
        if (this.fields.length === 0) return null;
        const ordered = [...this.fields].sort((a, b) => a.start - b.start);
        for (const f of ordered)
            if (!f.bypass && f.start > addr) return f;
        for (const f of ordered)
            if (!f.bypass) return f;
        return null;
    }

    /** Collect every screen position the cursor can tab into, sorted by
     *  buffer index. Two sources contribute: SF input fields (first data
     *  cell, skipping bypass) and ENPTUI selectable items (radio button,
     *  checkbox, push-button — anything the host expects the user to
     *  navigate through). Push-buttons and unavailable items are still
     *  navigable so the user can read them; the activation handler
     *  decides whether toggling actually does anything.
     *
     *  For selection items the stop lands on the FIRST TEXT CELL (one
     *  past the indicator + space). Real IBM 5250 / Host On-Demand do
     *  the same so the cursor block highlights the item label and the
     *  user can read which row they're on. */
    #tabStops () {
        const stops = [];
        for (const f of this.fields) {
            if (f.bypass) continue;
            stops.push((f.start + 1) % this.size);
        }
        for (const c of this.enptui.all) {
            if (!c.itemPositions) continue;
            // Push buttons and items without an indicator land flush
            // left; selection items land just past the "indicator + 1
            // space" prefix written by SelectionField.js.
            const offset = (c.kind === 'pushButtons' || !c.drawIndicator) ? 0 : 2;
            for (const pos of c.itemPositions) {
                const r = pos.row - 1;
                const cIdx = pos.col - 1 + offset;
                stops.push(r * this.cols + cIdx);
            }
        }
        return stops.sort((a, b) => a - b);
    }

    /** Locate the ENPTUI selectable item the cursor is currently on,
     *  if any. Used by the space-key handler to decide whether the
     *  press should toggle a selection vs. type a literal space. */
    enptuiItemAtCursor () {
        const r = (this.cursor / this.cols | 0) + 1;
        const c = (this.cursor % this.cols) + 1;
        for (const construct of this.enptui.all) {
            if (!construct.itemPositions) continue;
            if (construct.kind !== 'selectionField'
                && construct.kind !== 'pushButtons'
                && construct.kind !== 'menuBar') continue;
            const slotW = construct.itemSlotWidth
                ?? construct.textSize
                ?? 1;
            for (let i = 0; i < construct.itemPositions.length; i++) {
                const pos = construct.itemPositions[i];
                if (pos.row !== r) continue;
                if (c < pos.col || c >= pos.col + slotW) continue;
                return { construct, index: i };
            }
        }
        return null;
    }

    /** Buffer index of the first place a host invite should park the
     *  cursor — used by Terminal.handleRecord when the host didn't
     *  send an IC order. Considers SF input fields AND ENPTUI items so
     *  screens that have only checkboxes / radios still place focus on
     *  the first item instead of leaving the cursor at (1,1). */
    firstFocusable () {
        const stops = this.#tabStops();
        return stops.length ? stops[0] : null;
    }

    /** Move cursor to the next tab stop. If the field the cursor is in
     *  has a non-zero FCW 0x88 cursor-progression target, jump to that
     *  numbered field instead of the natural buffer-order next stop —
     *  this lets the host build non-sequential tab orders (data-entry
     *  forms often jump from CITY to ZIP and back to STATE, for
     *  instance). Cyclic when no explicit target is set. */
    tab () {
        const stops = this.#tabStops();
        if (stops.length === 0) return;
        const current = this.fieldAt(this.cursor);
        if (current && current.cursorProgress > 0) {
            // Cursor-progression value is the 1-based id of the target
            // SF field. Find the n-th non-bypass field in stream order.
            const targets = this.fields.filter(f => !f.bypass);
            const targetField = targets[current.cursorProgress - 1];
            if (targetField) {
                this.cursor = (targetField.start + 1) % this.size;
                return;
            }
        }
        const next = stops.find(s => s > this.cursor);
        this.cursor = next ?? stops[0];
    }

    /** Reverse of tab() — used by Shift+Tab. */
    backTab () {
        const stops = this.#tabStops();
        if (stops.length === 0) return;
        let prev = null;
        for (const s of stops) {
            if (s < this.cursor) prev = s;
            else break;
        }
        this.cursor = prev ?? stops[stops.length - 1];
    }

    backspace () {
        const prev = (this.cursor - 1 + this.size) % this.size;
        const cell = this.cells[prev];
        if (cell.attributePlace) return;
        cell.byte = 0x00;
        cell.glyph = ' ';
        const f = this.fieldAt(prev);
        if (f) f.modified = true;
        this.cursor = prev;
    }

    // ---- internals -----------------------------------------------------

    #advance () { this.cursor = (this.cursor + 1) % this.size; }

    /** Convert 1-based row/col into a buffer index. Out-of-range values
     *  are clamped silently so a misbehaving host can't crash us. */
    #index (row, col) {
        const r = Math.max(0, Math.min(this.rows - 1, (row | 0) - 1));
        const c = Math.max(0, Math.min(this.cols - 1, (col | 0) - 1));
        return r * this.cols + c;
    }

    /** Re-walk the buffer and re-assign each cell's active attribute
     *  descriptor based on the most-recent INLINE attribute place to
     *  its left (buffer-order). Two attribute-source types exist on a
     *  5250 screen and they propagate differently:
     *
     *    • Inline placeAttribute (0x20-0x3F bytes between data): each
     *      one resets the "running pen" forward through every blank
     *      cell until the next inline attribute place. This is how the
     *      long horizontal underline after `===>` appears on the Main
     *      Menu - the host emits attr 0x24 once and lets the pen carry
     *      across blank cells until the next inline reset.
     *
     *    • SF (Start of Field) attribute: the attribute byte at the
     *      field's start applies ONLY to the field's `length` data
     *      cells. Cells past `start + length` REVERT to the prior
     *      running pen rather than continuing the field's attribute.
     *      Without this rule a field with `attr 0x39` (pink-reverse)
     *      bleeds across the rest of the buffer.
     *
     *  Called from InboundParser at the end of every WTD record. */
    recalcAttributes () {
        let active = DEFAULT_ATTR_DESC;
        let i = 0;
        while (i < this.size) {
            const cell = this.cells[i];
            if (cell.attributePlace) {
                if (cell.startField && cell.field) {
                    // SF field start: apply this attr cell's CURRENT
                    // value (which may have been overwritten by a
                    // later placeAttribute targeting the same buffer
                    // position - see the Main Menu `===>` pattern) to
                    // every data cell of the field. Then skip past
                    // the field. The running pen does NOT change so
                    // cells beyond start+length resume whatever attr
                    // was active before the SF, preventing the field
                    // from bleeding visually.
                    const fieldDesc = cell.attr;
                    const len = cell.field.length;
                    for (let j = 1; j <= len; j++) {
                        const idx = (i + j) % this.size;
                        this.cells[idx].attr = fieldDesc;
                    }
                    i += 1 + len;
                    continue;
                }
                // Inline attribute byte: update the running pen.
                active = cell.attr;
            } else {
                cell.attr = active;
            }
            i++;
        }
    }
}
