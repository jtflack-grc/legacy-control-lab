// Canvas renderer for the 5250 presentation space.
//
// Each cell knows its attribute descriptor (see ScreenBuffer.placeAttribute);
// we map that to foreground/background colours, plus the modifier
// effects (blink / underline / reverse-image / hidden / column-sep).
// Attribute cells themselves are non-display and are never rendered.
//
// On top of the character grid we overlay ENPTUI primitives — windows,
// radio/checkbox indicators, push-button frames, menu bars, scroll bars
// — read from screen.enptui. These are rendered AFTER the cell layer so
// they paint over any underlying text/colour the host emitted.

import { ATTR_BASE } from '../proto/Constants.js';
import { COLOR, fgFor, bgFor } from './theme.js';
import { EnptuiOverlay } from './EnptuiOverlay.js';

export class Renderer {
    constructor (canvas, screen) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.screen = screen;
        this.cellWidth = 0;
        this.cellHeight = 0;
        this.horizontalPad = 6;
        this.fontSize = 16;
        this.cursorBlink = true;
        this.selection = null;
        this.overlay = new EnptuiOverlay(screen);

        // requestAnimationFrame coalescer - many records can arrive in
        // rapid succession (especially during a sign-off / menu switch);
        // we collapse all of them into a single paint per frame so the
        // user doesn't see the intermediate clear-screen flashes.
        this._rafPending = false;

        // One blink ticker only - 500ms toggle drives both the cursor
        // and any blinking attribute. Same pattern tn3270 uses.
        setInterval(() => {
            this.cursorBlink = !this.cursorBlink;
            this.draw();
        }, 500);
    }

    /** External hook for input selection - re-uses the coalesced draw. */
    setSelection (sel) { this.selection = sel; this.draw(); }

    resize () {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width  = Math.max(1, Math.floor(rect.width));
        this.canvas.height = Math.max(1, Math.floor(rect.height));
        const s = this.screen;
        const drawableWidth = Math.max(1, this.canvas.width - this.horizontalPad * 2);
        this.cellWidth  = drawableWidth / s.cols;
        this.cellHeight = this.canvas.height / s.rows;
        this.fontSize = this.#computeFontSize();
        this.draw();
    }

    #computeFontSize () {
        const ctx = this.ctx;
        // Find the largest font that keeps glyphs within cell bounds.
        for (let sz = Math.floor(this.cellHeight); sz >= 6; sz--) {
            ctx.font = `${sz}px "IBM Plex Mono", monospace`;
            const w = ctx.measureText('W').width;
            if (w <= this.cellWidth * 0.88) return sz;
        }
        return 8;
    }

    /** Public entry. Coalesces multiple synchronous calls into a single
     *  paint that fires on the next animation frame. The browser will
     *  also batch with its own paint cycle, so a burst of N draws never
     *  results in more than 1 visible frame per screen refresh. */
    draw () {
        if (this._rafPending) return;
        this._rafPending = true;
        requestAnimationFrame(() => {
            this._rafPending = false;
            this.#renderNow();
        });
    }

    #renderNow () {
        const s = this.screen;
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.fillStyle = COLOR.black;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.font = `${this.fontSize}px "IBM Plex Mono", monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        // Pre-compute the highlight-on-entry override: if the cursor is
        // inside an input field whose FCW 0x89 set a per-field attribute,
        // every cell of that field is rendered with that attribute byte
        // instead of its own. Mirrors real 5250 hardware which swaps the
        // colour of the entire field the moment the user enters it.
        const cursorField = s.fieldAt(s.cursor);
        const highlightDesc = (cursorField && cursorField.highlightAttr)
            ? (ATTR_BASE[cursorField.highlightAttr] ?? null)
            : null;

        for (let r = 0; r < s.rows; r++) {
            for (let c = 0; c < s.cols; c++) {
                const idx = r * s.cols + c;
                const cell = s.cells[idx];
                if (cell.attributePlace) continue;       // non-display

                const x = this.horizontalPad + c * this.cellWidth;
                const y = r * this.cellHeight;

                // Apply highlight-on-entry over the field's cells.
                const useDesc = (highlightDesc && cell.field === cursorField)
                    ? highlightDesc : cell.attr;
                const fg = useDesc.hidden ? (useDesc.bg ? COLOR[useDesc.bg] : '#000')
                                          : (COLOR[useDesc.fg] ?? COLOR.green);
                const bg = COLOR[useDesc.bg] ?? COLOR.black;
                if (bg !== COLOR.black || useDesc.reverse) {
                    ctx.fillStyle = useDesc.reverse ? fg : bg;
                    ctx.fillRect(x, y, this.cellWidth, this.cellHeight);
                }

                // Blink: skip drawing the glyph on the "off" half of
                // the cursor ticker (shares the 500ms cadence so we
                // never run multiple intervals fighting each other).
                if (useDesc.blink && !this.cursorBlink) continue;

                const drawFg = useDesc.reverse ? bg : fg;
                ctx.fillStyle = drawFg;
                const glyph = cell.glyph || ' ';
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, this.cellWidth, this.cellHeight);
                ctx.clip();
                ctx.fillText(glyph, x + this.cellWidth * 0.06, y + this.cellHeight / 2);
                ctx.restore();

                // Underline. Real IBM 5250 hardware underlines only
                // cells whose active
                // attribute byte has the UL flag set - that's bytes
                // 0x24-0x26, 0x2C-0x2E, 0x34-0x36, 0x3C-0x3E in
                // ATTR_BASE. Input fields with a non-underline
                // attribute (e.g. 0x20 plain green) must render
                // without an underscore.
                if (useDesc.underline) {
                    ctx.fillStyle = drawFg;
                    ctx.fillRect(x, y + this.cellHeight - 1, this.cellWidth, 1);
                }

                // Extended attribute (Write Extended Attribute) — only
                // a handful of pens are commonly used: type 0x02 carries
                // additional highlight bits (0x04 underline, 0x08 blink,
                // 0x40 reverse) that stack with the basic attribute.
                if (cell.extAttr && cell.extAttr.type === 0x02) {
                    const v = cell.extAttr.value;
                    if ((v & 0x04) && !useDesc.underline) {
                        ctx.fillStyle = drawFg;
                        ctx.fillRect(x, y + this.cellHeight - 1, this.cellWidth, 1);
                    }
                }
                // Column separators existed on real IBM 5250 hardware
                // but modern emulators skip them by
                // default - they clutter the screen on every cell of a
                // 0x30-0x33 run. We follow the same convention; flip
                // this on if you actually want them.
            }
        }

        // ENPTUI overlay - paints windows, selection markers, push
        // buttons, menu bars and scroll bars on top of the cell grid.
        this.overlay.paint(ctx, {
            cellWidth:     this.cellWidth,
            cellHeight:    this.cellHeight,
            fontSize:      this.fontSize,
            cursorBlink:   this.cursorBlink,
            horizontalPad: this.horizontalPad,
        });

        // Selection overlay (mouse drag).
        if (this.selection) {
            ctx.fillStyle = 'rgba(80, 145, 255, 0.35)';
            const sel = this.selection;
            const x1 = this.horizontalPad + sel.col1 * this.cellWidth;
            const y1 = sel.row1 * this.cellHeight;
            const w  = (sel.col2 - sel.col1 + 1) * this.cellWidth;
            const h  = (sel.row2 - sel.row1 + 1) * this.cellHeight;
            ctx.fillRect(x1, y1, w, h);
        }

        // Cursor block. Solid semi-transparent fill at the bottom of
        // the cursor cell - red when keyboard is locked (system wait),
        // white otherwise. Same convention tn3270 uses; avoids the
        // 'difference' composite mode which can flicker during fast
        // transitions like sign-off.
        if (this.cursorBlink) {
            const cx = this.horizontalPad + (s.cursor % s.cols) * this.cellWidth;
            const cy = (s.cursor / s.cols | 0) * this.cellHeight;
            ctx.fillStyle = s.keyboardLocked
                ? 'rgba(255, 80, 80, 0.55)'
                : 'rgba(255, 255, 255, 0.55)';
            ctx.fillRect(cx, cy + this.cellHeight - 4, this.cellWidth, 4);
        }
    }

}
