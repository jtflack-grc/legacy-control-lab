// Mouse-drag selection + clipboard for the 5250 terminal. Mirrors the
// TN3270 Selection module but adapts the selection-to-text routine to
// the 5250 cell attribute (which carries hidden state on `cell.attr`).
//
// When the mouse-up is not a drag (plain click), Selection calls back
// `onClickCursor(click)` so the owning InputController can decide
// whether the click activates an ENPTUI item or just moves the cursor.

export class Selection {
    /**
     * @param {object} hooks
     * @param {HTMLCanvasElement} hooks.canvas
     * @param {import('./Renderer.js').Renderer} hooks.renderer
     * @param {import('../display/ScreenBuffer.js').ScreenBuffer} hooks.screen
     * @param {(click:{row:number,col:number})=>void} hooks.onClickCursor
     * @param {(text:string)=>void} hooks.onType
     * @param {(text:string)=>void} hooks.onFlash
     */
    constructor (hooks) {
        this.h = hooks;
        this.canvas = hooks.canvas;
        this.renderer = hooks.renderer;
        this.screen = hooks.screen;

        this.selection = null;
        this.dragOrigin = null;
        this.dragMoved = false;
        this.#bindMouse();
    }

    hasSelection () { return this.selection !== null; }

    clear () {
        this.selection = null;
        this.renderer.setSelection?.(null);
    }

    selectAll () {
        const s = this.screen;
        this.selection = { row1: 0, col1: 0, row2: s.rows - 1, col2: s.cols - 1 };
        this.renderer.setSelection?.(this.selection);
    }

    async copy () {
        const text = this.#selectionToText();
        if (!text) { this.h.onFlash?.('nothing selected'); return; }
        try {
            await navigator.clipboard.writeText(text);
            this.h.onFlash?.(`copied ${text.length} chars`);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity  = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); this.h.onFlash?.(`copied ${text.length} chars`); }
            catch { this.h.onFlash?.('copy failed'); }
            finally { document.body.removeChild(ta); }
        }
    }

    async paste () {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            // 5250 fields are flat; strip line breaks / tabs so they
            // don't reach the field as literal control characters.
            const cleaned = text.replace(/[\r\n\t]+/g, ' ');
            this.h.onType?.(cleaned);
        } catch {
            this.h.onFlash?.('paste blocked');
        }
    }

    // ---- mouse --------------------------------------------------------

    #bindMouse () {
        this.canvas.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return;
            this.dragOrigin = this.#cellAtMouse(event);
            this.dragMoved = false;
            this.selection = this.#norm(this.dragOrigin, this.dragOrigin);
            this.renderer.setSelection?.(this.selection);
        });
        this.canvas.addEventListener('mousemove', (event) => {
            if (!this.dragOrigin) return;
            const cell = this.#cellAtMouse(event);
            if (cell.row !== this.dragOrigin.row || cell.col !== this.dragOrigin.col)
                this.dragMoved = true;
            this.selection = this.#norm(this.dragOrigin, cell);
            this.renderer.setSelection?.(this.selection);
        });
        document.addEventListener('mouseup', () => {
            if (!this.dragOrigin) return;
            const wasDrag = this.dragMoved;
            const click = this.dragOrigin;
            this.dragOrigin = null;
            if (!wasDrag) {
                this.selection = null;
                this.renderer.setSelection?.(null);
                this.h.onClickCursor?.(click);
            }
        });
    }

    #cellAtMouse (event) {
        const rect = this.canvas.getBoundingClientRect();
        const pad = this.renderer.horizontalPad ?? 0;
        const cw = (rect.width - pad * 2) / this.screen.cols;
        const ch = rect.height / this.screen.rows;
        const col = Math.max(0, Math.min(this.screen.cols - 1,
            Math.floor((event.clientX - rect.left - pad) / cw)));
        const row = Math.max(0, Math.min(this.screen.rows - 1,
            Math.floor((event.clientY - rect.top) / ch)));
        return { row, col };
    }

    #norm (o, e) {
        return {
            row1: Math.min(o.row, e.row),
            col1: Math.min(o.col, e.col),
            row2: Math.max(o.row, e.row),
            col2: Math.max(o.col, e.col),
        };
    }

    #selectionToText () {
        if (!this.selection) return '';
        const s = this.screen;
        const lines = [];
        for (let r = this.selection.row1; r <= this.selection.row2; r++) {
            let line = '';
            for (let c = this.selection.col1; c <= this.selection.col2; c++) {
                const cell = s.cells[r * s.cols + c];
                if (!cell) continue;
                line += cell.attr?.hidden ? ' ' : (cell.glyph || ' ');
            }
            lines.push(line.replace(/\s+$/, ''));
        }
        return lines.join('\n');
    }
}
