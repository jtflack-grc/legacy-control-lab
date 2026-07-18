// Input handling: keyboard → terminal commands, mouse → selection +
// cursor placement, clipboard copy/paste. Pure UI glue - talks to the
// Terminal via callback hooks; never touches the wire directly.

import { aidFromName } from '../proto/Constants.js';
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
            canvas:       hooks.canvas,
            renderer:     hooks.renderer,
            screen:       hooks.screen,
            onMoveCursor: hooks.onMoveCursor,
            onType:       hooks.onType,
            onFlash:      hooks.onFlash,
        });

        this.#bindKeyboard();
    }

    // ---- keyboard -----------------------------------------------------

    #bindKeyboard () {
        document.addEventListener('keydown', async (event) => {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')
                return;
            const mod = event.metaKey || event.ctrlKey;

            // Clipboard shortcuts work even offline.
            if (mod && event.key.toLowerCase() === 'c') {
                event.preventDefault(); await this.selection.copy(); return;
            }
            if (mod && event.key.toLowerCase() === 'v') {
                event.preventDefault(); await this.selection.paste(); return;
            }
            if (mod && event.key.toLowerCase() === 'a') {
                event.preventDefault(); this.selection.selectAll(); return;
            }

            if (event.key === 'Escape' && this.selection.hasSelection()) {
                event.preventDefault();
                this.selection.clear();
                return;
            }

            const aid = this.#functionKeyName(event);
            if (aid) {
                event.preventDefault();
                const code = aidFromName(aid);
                if (code !== null) this.h.onAid?.(code);
                return;
            }

            if (event.key === 'Tab')        { event.preventDefault(); this.h.onTab?.(); return; }
            if (event.key === 'Backspace')  { event.preventDefault(); this.h.onBackspace?.(); return; }

            if (event.key === 'Insert')     { event.preventDefault(); this.h.onToggleInsert?.(); return; }

            if (event.key === 'Home')       { event.preventDefault(); this.#home(); return; }
            if (event.key === 'End')        { event.preventDefault(); this.#end(); return; }

            if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
                event.preventDefault();
                this.#arrow(event.key);
                return;
            }

            if (event.key.length === 1 && !mod) {
                event.preventDefault();
                this.h.onType?.(event.key);
            }
        });
    }

    #functionKeyName (event) {
        if (event.key === 'Enter')    return 'Enter';
        if (event.key === 'Escape')   return 'Clear';
        if (event.key === 'PageUp')   return 'PF7';
        if (event.key === 'PageDown') return 'PF8';
        if (event.key.startsWith('F') && /^F([1-9]|1[0-9]|2[0-4])$/.test(event.key)) {
            const n = parseInt(event.key.slice(1), 10);
            return event.shiftKey ? `PF${n + 12}` : `PF${n}`;
        }
        return null;
    }

    #home () {
        const target = this.screen.fields.find(f => !f.protected);
        if (target) this.h.onMoveCursor?.((target.start + 1) % this.screen.size);
    }

    #end () {
        const s = this.screen;
        const here = s.cursor;
        const field = s.fieldAt(here);
        if (!field || field.protected) return;
        let last = (field.start + 1) % s.size;
        let p = (field.start + 1) % s.size;
        for (let n = 1; n < field.length; n++) {
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
        this.h.onMoveCursor?.(addr);
    }
}
