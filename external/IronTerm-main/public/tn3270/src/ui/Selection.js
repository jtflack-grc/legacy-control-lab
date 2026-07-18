// Mouse-drag selection state + clipboard copy/paste for the 3270
// terminal. The InputController owns the keydown listener and delegates
// clipboard / select-all keyboard chords here; the canvas-level mouse
// listeners are bound by this class directly.

export class Selection {
    /**
     * @param {object} hooks
     * @param {HTMLCanvasElement} hooks.canvas
     * @param {import('./Renderer.js').Renderer} hooks.renderer
     * @param {import('../display/ScreenBuffer.js').ScreenBuffer} hooks.screen
     * @param {(addr:number)=>void} hooks.onMoveCursor
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

    // ---- public API (called from InputController) --------------------

    hasSelection () { return this.selection !== null; }

    clear () {
        this.selection = null;
        this.renderer.setSelection(null);
    }

    selectAll () {
        const s = this.screen;
        this.selection = { row1: 0, col1: 0, row2: s.rows - 1, col2: s.cols - 1 };
        this.renderer.setSelection(this.selection);
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
            // 3270 input fields are flat - strip line breaks and tabs so
            // they don't get typed as literal control chars.
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
            this.renderer.setSelection(this.selection);
        });
        this.canvas.addEventListener('mousemove', (event) => {
            if (!this.dragOrigin) return;
            const cell = this.#cellAtMouse(event);
            if (cell.row !== this.dragOrigin.row || cell.col !== this.dragOrigin.col)
                this.dragMoved = true;
            this.selection = this.#norm(this.dragOrigin, cell);
            this.renderer.setSelection(this.selection);
        });
        document.addEventListener('mouseup', () => {
            if (!this.dragOrigin) return;
            const wasDrag = this.dragMoved;
            const click = this.dragOrigin;
            this.dragOrigin = null;
            if (!wasDrag) {
                this.selection = null;
                this.renderer.setSelection(null);
                const addr = click.row * this.screen.cols + click.col;
                this.h.onMoveCursor?.(addr);
            }
        });
    }

    #cellAtMouse (event) {
        const rect = this.canvas.getBoundingClientRect();
        const cw = rect.width  / this.screen.cols;
        const ch = rect.height / this.screen.rows;
        const col = Math.max(0, Math.min(this.screen.cols - 1,
            Math.floor((event.clientX - rect.left) / cw)));
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
                line += cell.hidden ? ' ' : (cell.glyph || ' ');
            }
            lines.push(line.replace(/\s+$/, ''));
        }
        return lines.join('\n');
    }
}
