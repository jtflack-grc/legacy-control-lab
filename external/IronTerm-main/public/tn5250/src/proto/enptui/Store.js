// ENPTUI construct store. Lives on `screen.enptui` and tracks every
// active GUI primitive (windows, selection fields, push buttons, menu
// bars, scroll bars). Constructs are keyed by their starting buffer
// address (the SBA where the host emitted the CreateWindow / DefineSelFld
// segment), so we can quickly remove them with a `removeAt(addr)` when
// the host sends a Remove* command.
//
// The renderer iterates this store every paint to overlay the GUI
// primitives on top of the regular character cells. The input layer
// consults it to figure out which construct (if any) owns the cell the
// user is clicking on.

import { ConstructKind } from './Constants.js';

export class EnptuiStore {
    constructor () {
        this.constructs = [];        // insertion-ordered for paint correctness
    }

    clear () {
        this.constructs = [];
    }

    add (construct) {
        if (!construct) return;
        // The host may re-emit a construct at the same SBA position
        // (e.g. refreshing a selection field). Replace in place rather
        // than stacking duplicates.
        const idx = this.constructs.findIndex(c =>
            c.cursorAtStart === construct.cursorAtStart && c.kind === construct.kind);
        if (idx >= 0) this.constructs[idx] = construct;
        else this.constructs.push(construct);
    }

    removeAt (cursor, kind) {
        const removed = this.constructs.filter(c =>
            c.cursorAtStart === cursor && (!kind || c.kind === kind));
        this.constructs = this.constructs.filter(c =>
            !(c.cursorAtStart === cursor && (!kind || c.kind === kind)));
        return removed;
    }

    /** Remove every construct that lies entirely inside `window`'s
     *  bounding rectangle, the way a CreateWindow region is
     *  destroyed - any SelectionField, ScrollBar, Grid, Mouse region
     *  that the host previously anchored INSIDE the window goes away
     *  with it. Returns the removed children for inspection. */
    removeChildrenOf (window) {
        if (!window) return [];
        const top    = window.topRow;
        const left   = window.leftCol;
        const bot    = top  + window.height - 1;
        const right  = left + window.width  - 1;
        const inside = (r, c) => r >= top && r <= bot && c >= left && c <= right;
        const removed = [];
        this.constructs = this.constructs.filter(c => {
            // Window itself stays; we only cascade children.
            if (c === window) return true;
            // Resolve construct row/col (some use top/left, others row/col).
            const r = c.topRow ?? c.row ?? null;
            const cc = c.leftCol ?? c.col ?? null;
            if (r === null || cc === null) return true;
            if (inside(r, cc)) { removed.push(c); return false; }
            return true;
        });
        return removed;
    }

    /** Remove every construct linked as a child of `parent` (via the
     *  `parent` reference set when a SelectionField has an attached
     *  ScrollBar). */
    removeChildrenLinkedTo (parent) {
        if (!parent) return [];
        const removed = this.constructs.filter(c => c.parent === parent);
        this.constructs = this.constructs.filter(c => c.parent !== parent);
        return removed;
    }

    /** Iterate all constructs of a given kind. */
    *of (kind) {
        for (const c of this.constructs) if (c.kind === kind) yield c;
    }

    /** First construct that visually contains the given (row, col) - 1-based. */
    constructAt (row, col) {
        for (const c of this.constructs) {
            if (c.kind === ConstructKind.WINDOW
                && row >= c.topRow && row < c.topRow + c.height
                && col >= c.leftCol && col < c.leftCol + c.width)
                return c;
        }
        return null;
    }

    get all () { return this.constructs; }
}
