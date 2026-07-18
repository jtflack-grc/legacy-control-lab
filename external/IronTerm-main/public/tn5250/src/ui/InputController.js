// Input handling for the TN5250 client: keyboard → AID / typing,
// mouse → cursor placement + selection, clipboard copy/paste.
//
// Mirrors the TN3270 controller's architecture (document-level keydown
// so the canvas doesn't need focus) but with the 5250 AID set and
// navigation conventions: PageUp = Roll Down, PageDown = Roll Up,
// Help = Ctrl+H, Print = Ctrl+P, Escape = Error Reset.

import { Aid, aidFromName } from '../proto/Constants.js';
import { ConstructKind } from '../proto/enptui/Constants.js';
import { Selection } from './Selection.js';

export class InputController {
    /**
     * @param {object} hooks
     * @param {HTMLCanvasElement} hooks.canvas
     * @param {import('./Renderer.js').Renderer} hooks.renderer
     * @param {import('../display/ScreenBuffer.js').ScreenBuffer} hooks.screen
     * @param {(aid:number)=>void}  hooks.onAid
     * @param {(s:string)=>void}    hooks.onType
     * @param {()=>void}            hooks.onTab
     * @param {()=>void}            hooks.onBackspace
     * @param {(addr:number)=>void} hooks.onMoveCursor
     * @param {(text:string)=>void} hooks.onFlash
     */
    constructor (hooks) {
        this.h = hooks;
        this.canvas = hooks.canvas;
        this.renderer = hooks.renderer;
        this.screen = hooks.screen;

        this.selection = new Selection({
            canvas:        hooks.canvas,
            renderer:      hooks.renderer,
            screen:        hooks.screen,
            onType:        hooks.onType,
            onFlash:       hooks.onFlash,
            onClickCursor: (click) => this.#handleClick(click),
        });

        this.#bindKeyboard();
    }

    #handleClick (click) {
        if (this.#tryEnptuiClick(click)) return;
        const addr = click.row * this.screen.cols + click.col;
        this.h.onMoveCursor?.(addr);
    }

    // ---- keyboard -----------------------------------------------------

    #bindKeyboard () {
        document.addEventListener('keydown', async (event) => {
            // Let the toolbar / form fields keep their own input. Match
            // the same activeElement guard tn3270 uses so typing into
            // the bridge URL doesn't leak into the terminal.
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')
                return;
            const mod = event.metaKey || event.ctrlKey;

            // Clipboard shortcuts (work offline too).
            if (mod && event.key.toLowerCase() === 'c') {
                event.preventDefault(); await this.selection.copy(); return;
            }
            if (mod && event.key.toLowerCase() === 'v') {
                event.preventDefault(); await this.selection.paste(); return;
            }
            if (mod && event.key.toLowerCase() === 'a') {
                event.preventDefault(); this.selection.selectAll(); return;
            }
            // Ctrl chords for 5250-specific AIDs not on a function key.
            if (mod && event.key.toLowerCase() === 'h') {
                event.preventDefault(); this.h.onAid?.(Aid.HELP); return;
            }
            if (mod && event.key.toLowerCase() === 'p') {
                event.preventDefault(); this.h.onAid?.(Aid.PRINT); return;
            }

            // Alt+letter: ENPTUI mnemonic activation. Walk every
            // selection field / menu bar / push-button group and find
            // the item whose mnemonicOffset designates the typed
            // character within its label. Alt+A jumps straight to the
            // item whose mnemonic is 'A' in a radio list.
            if (event.altKey && !event.ctrlKey && !event.metaKey
                && event.key.length === 1) {
                if (this.#tryMnemonic(event.key)) {
                    event.preventDefault();
                    return;
                }
            }

            if (event.key === 'Escape') {
                if (this.selection.hasSelection()) {
                    event.preventDefault();
                    this.selection.clear();
                    return;
                }
                // Error-reset: clears the operator-input-inhibit lock
                // without sending anything. Same role as 5250 Reset key.
                event.preventDefault();
                this.screen.keyboardLocked = false;
                this.h.onFlash?.('reset');
                this.renderer.draw();
                return;
            }

            const aid = this.#functionKeyName(event);
            if (aid) {
                event.preventDefault();
                const code = aidFromName(aid);
                if (code !== null) this.h.onAid?.(code);
                return;
            }

            if (event.key === 'Tab') {
                event.preventDefault();
                if (event.shiftKey) this.h.onBackTab?.();
                else                this.h.onTab?.();
                return;
            }
            if (event.key === 'Backspace')  { event.preventDefault(); this.h.onBackspace?.(); return; }

            if (event.key === 'Home')       { event.preventDefault(); this.#home(); return; }
            if (event.key === 'End')        { event.preventDefault(); this.#end(); return; }

            if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
                event.preventDefault();
                this.#arrow(event.key);
                return;
            }

            if (event.key.length === 1 && !mod) {
                event.preventDefault();
                // Space on an ENPTUI item toggles the selection / activates
                // the push button — space is bound to the focused item
                // rather than typing a literal space. Fall back to typing
                // only when no item owns the cursor cell.
                if (event.key === ' ') {
                    const hit = this.screen.enptuiItemAtCursor?.();
                    if (hit) {
                        this.#activateEnptuiItem(hit.construct, hit.index);
                        return;
                    }
                }
                this.h.onType?.(event.key);
            }
        });
    }

    /** Translate a keyboard event into a 5250 AID name (or null). The
     *  mapping follows the IBM i operator convention used by every
     *  5250 emulator: F1-F12 send PF1-12, Shift+F1-F12 send PF13-24,
     *  PageUp / PageDown drive Roll Up / Roll Down (note the screen
     *  semantics are flipped from the keyboard label - rolling "up"
     *  brings later content into view, like Page Down). */
    #functionKeyName (event) {
        if (event.key === 'Enter')    return 'Enter';
        if (event.key === 'PageDown') return 'RollUp';   // bring next page up
        if (event.key === 'PageUp')   return 'RollDown'; // bring previous page down
        if (event.key.startsWith('F') && /^F([1-9]|1[0-9]|2[0-4])$/.test(event.key)) {
            const n = parseInt(event.key.slice(1), 10);
            return event.shiftKey ? `PF${n + 12}` : `PF${n}`;
        }
        return null;
    }

    /** Home goes to the first character of the first unprotected,
     *  non-bypass field (matches IBM 5250 Home key behaviour). */
    #home () {
        const target = this.screen.fields.find(f => !f.bypass);
        if (target) this.h.onMoveCursor?.((target.start + 1) % this.screen.size);
    }

    /** End walks the current field forward to the last non-null cell -
     *  the natural position after the user types into it. */
    #end () {
        const s = this.screen;
        const here = s.cursor;
        const field = s.fieldAt(here);
        if (!field || field.bypass) return;
        let last = (field.start + 1) % s.size;
        let p = (field.start + 1) % s.size;
        // `field.length` is the count of data cells (excludes attr).
        for (let n = 0; n < field.length; n++) {
            const cell = s.cells[p];
            if (cell && cell.byte !== 0x00 && cell.glyph !== ' ')
                last = (p + 1) % s.size;
            p = (p + 1) % s.size;
        }
        this.h.onMoveCursor?.(last);
    }

    #arrow (key) {
        const s = this.screen;
        let addr = s.cursor;
        if (key === 'ArrowLeft')  addr = (addr - 1 + s.size) % s.size;
        if (key === 'ArrowRight') addr = (addr + 1) % s.size;
        if (key === 'ArrowUp')    addr = (addr - s.cols + s.size) % s.size;
        if (key === 'ArrowDown')  addr = (addr + s.cols) % s.size;

        // ENPTUI window cursor restriction. If the cursor was inside a
        // window that was created with the "restricted cursor" flag
        // (flag1 bit 0x80 clear in CreateWindow) AND the host hasn't
        // sent UNREST_WIN_CURSOR since, clamp the new position to the
        // window's interior, per the ENPTUI reference.
        const window = this.#enclosingRestrictedWindow(s.cursor);
        if (window) {
            const target = this.#clampToWindow(addr, window);
            if (target !== null) addr = target;
        }
        this.h.onMoveCursor?.(addr);
    }

    /** Find the most-recently-defined restricted ENPTUI window that
     *  contains buffer index `cursor`. Returns null if no such window
     *  is active or the cursor is outside every restricted window. */
    #enclosingRestrictedWindow (cursor) {
        const s = this.screen;
        if (!s.enptui) return null;
        const r = (cursor / s.cols | 0) + 1;
        const c = (cursor % s.cols) + 1;
        for (const w of s.enptui.all) {
            if (w.kind !== ConstructKind.WINDOW) continue;
            if (!w.cursorRestricted) continue;
            if (r >= w.topRow && r < w.topRow + w.height
             && c >= w.leftCol && c < w.leftCol + w.width) return w;
        }
        return null;
    }

    /** Project buffer index `addr` back into the window's interior.
     *  Returns the clamped index, or null when no clamp was needed. */
    #clampToWindow (addr, w) {
        const s = this.screen;
        const r = (addr / s.cols | 0) + 1;
        const c = (addr % s.cols) + 1;
        const top = w.topRow,    bot   = w.topRow  + w.height - 1;
        const left = w.leftCol,  right = w.leftCol + w.width  - 1;
        if (r >= top && r <= bot && c >= left && c <= right) return null;
        const rr = Math.max(top, Math.min(bot, r));
        const cc = Math.max(left, Math.min(right, c));
        return (rr - 1) * s.cols + (cc - 1);
    }

    // ---- ENPTUI click handling ----------------------------------------

    /** ENPTUI: handle a click that may have landed on a radio button,
     *  checkbox, push button, mouse region or scroll bar. Returns true
     *  when the click was consumed (so the caller should NOT also move
     *  the cursor). */
    #tryEnptuiClick (click) {
        const s = this.screen;
        if (!s.enptui || s.enptui.all.length === 0) return false;
        const row1 = click.row + 1;
        const col1 = click.col + 1;

        for (const c of s.enptui.all) {
            if (c.kind === ConstructKind.MOUSE_REGION) {
                if (row1 >= c.row && row1 < c.row + c.rows
                 && col1 >= c.col && col1 < c.col + c.cols) {
                    if (c.aidCode) this.h.onAid?.(c.aidCode);
                    return true;
                }
                continue;
            }
            if (c.kind === ConstructKind.SCROLL_BAR) {
                if (this.#tryScrollBarClick(c, row1, col1)) return true;
                continue;
            }
            if (c.kind !== ConstructKind.SELECTION_FIELD
                && c.kind !== ConstructKind.PUSH_BUTTONS
                && c.kind !== ConstructKind.MENU_BAR) continue;
            for (let i = 0; i < c.items.length; i++) {
                const pos = c.itemPositions?.[i];
                if (!pos) continue;
                const startCol = pos.col;
                const endCol   = pos.col + (c.itemSlotWidth ?? c.textSize ?? 1) - 1;
                if (row1 !== pos.row) continue;
                if (col1 < startCol || col1 > endCol) continue;
                this.#activateEnptuiItem(c, i);
                return true;
            }
        }
        return false;
    }

    /** Hit-test a click against the scroll bar's interactive zones and
     *  fire the appropriate scroll AID. Hit-zone codes (1=upArrow,
     *  2=dnArrow,
     *  5=pageUp, 6=pageDown, 9=thumb). We don't model arrow buttons as
     *  separate cells - the first and last cell of the bar act as
     *  arrow buttons.
     *
     *  The bar's `direction` field is 0 = vertical, 1 = horizontal.
     *  AIDs sent: Roll Up / Roll Down for vertical movement; Roll Left
     *  / Roll Right for horizontal. The host receives the AID and
     *  responds with a refreshed list + WRITE_DATA carrying the new
     *  slider position. */
    #tryScrollBarClick (sb, row1, col1) {
        const vertical = sb.direction === 0;
        const start    = vertical ? sb.rowOffset + 1 : sb.colOffset + 1;
        const end      = start + sb.length - 1;
        const axis     = vertical ? row1 : col1;
        const offAxis  = vertical ? col1 : row1;
        const onAxis   = vertical ? sb.colOffset + 1 : sb.rowOffset + 1;
        if (offAxis !== onAxis) return false;
        if (axis < start || axis > end) return false;

        // Map axis position to one of: top arrow, bottom arrow, shaft
        // above thumb, shaft below thumb, thumb. Thumb covers a span
        // proportional to visibleRows/totalRows of the bar's length.
        const thumbLen  = Math.max(1, Math.floor(sb.length * (sb.visibleRows / Math.max(sb.totalRows, 1))));
        const thumbPos  = Math.floor((sb.sliderPos / Math.max(sb.totalRows, 1)) * sb.length);
        const thumbStart = start + 1 + thumbPos;        // +1 to skip the top arrow
        const thumbEnd   = thumbStart + thumbLen - 1;
        let aid;
        if (axis === start)                     aid = vertical ? Aid.ROLL_DOWN  : Aid.ROLL_LEFT;
        else if (axis === end)                  aid = vertical ? Aid.ROLL_UP    : Aid.ROLL_RIGHT;
        else if (axis < thumbStart)             aid = vertical ? Aid.ROLL_DOWN  : Aid.ROLL_LEFT;
        else if (axis > thumbEnd)               aid = vertical ? Aid.ROLL_UP    : Aid.ROLL_RIGHT;
        else                                    aid = null;   // thumb click - host will refresh after drag
        if (aid !== null) this.h.onAid?.(aid);
        return true;
    }

    /** Look for an ENPTUI item whose mnemonic letter matches the typed
     *  character (case-insensitive). For radio/checkbox lists the
     *  cursor jumps to the item and toggles it; for push-buttons /
     *  menu bars the item's AID is fired directly. Returns true when
     *  a match was found. */
    #tryMnemonic (ch) {
        const target = ch.toLowerCase();
        const s = this.screen;
        for (const c of s.enptui.all) {
            if (c.kind !== ConstructKind.SELECTION_FIELD
                && c.kind !== ConstructKind.PUSH_BUTTONS
                && c.kind !== ConstructKind.MENU_BAR) continue;
            for (let i = 0; i < c.items.length; i++) {
                const item = c.items[i];
                if (item.unavailable) continue;
                if (item.mnemonicOffset < 0) continue;
                const byte = item.textBytes?.[item.mnemonicOffset];
                if (byte === undefined) continue;
                const ch = s.ebcdic.toChar(byte);
                if (!ch) continue;
                if (ch.toLowerCase() !== target) continue;
                this.#activateEnptuiItem(c, i);
                return true;
            }
        }
        return false;
    }

    #activateEnptuiItem (construct, idx) {
        const item = construct.items[idx];
        if (!item || item.unavailable) return;

        // Push buttons: clicking sends an AID immediately (the host
        // delivered the AID code in the item's flag bytes when it
        // defined the field; default to ENTER if absent).
        if (construct.kind === ConstructKind.PUSH_BUTTONS) {
            const aid = item.aidCode || Aid.ENTER;
            this.h.onAid?.(aid);
            return;
        }

        // Menu bar items: a bar click is an AID submission
        // that lets the host repaint with a SINGLE_SEL_PULL or
        // PUSH_BUTTON_PULL submenu anchored below the clicked bar item.
        // Move the cursor onto the item first so the host knows which
        // bar entry was activated, then send the item's AID (or Enter).
        if (construct.kind === ConstructKind.MENU_BAR) {
            const pos = construct.itemPositions[idx];
            if (pos) {
                const idxBuf = (pos.row - 1) * this.screen.cols + (pos.col - 1);
                this.h.onMoveCursor?.(idxBuf);
            }
            const aid = item.aidCode || Aid.ENTER;
            this.h.onAid?.(aid);
            return;
        }

        // Single-select (radio): clear other items in the same group,
        // mark this one selected.
        if (construct.single) {
            for (const other of construct.items) other.selected = false;
            item.selected = true;
        } else {
            // Multi-select (checkbox): toggle.
            item.selected = !item.selected;
        }
        // Repaint immediately so the user sees the change before
        // submitting the AID; the indicator overlay reads from
        // construct.items so no further state update is needed.
        this.#repaintItem(construct, idx);
        this.renderer.draw();
    }

    /** Update the indicator cell to reflect the new selected state.
     *  Without this, the underlying EBCDIC byte that was painted at
     *  decode time stays at '.', '/', etc. */
    #repaintItem (construct, idx) {
        if (!construct.drawIndicator) return;
        const pos = construct.itemPositions[idx];
        if (!pos) return;
        const s = this.screen;
        const cellIdx = (pos.row - 1) * s.cols + (pos.col - 1);
        const cell = s.cells[cellIdx];
        if (!cell) return;
        // Sync the on-screen EBCDIC indicator with the new state so
        // submit time (when the host reads the screen) sees it.
        if (construct.single) {
            cell.byte = construct.items[idx].selected ? 0x4B /* . */ : 0x40 /* sp */;
        } else {
            cell.byte = construct.items[idx].selected ? 0x61 /* / */ : 0x40 /* sp */;
        }
        cell.glyph = s.ebcdic.toChar(cell.byte);
    }

}

export { aidFromName };
