// Tiny ASCII teletype overlay shown while the connection is in NVT mode
// (Telnet's default text mode, before BINARY is negotiated). Many
// connection brokers / Hercules pre-3270 banners arrive in this mode;
// without this overlay the user just sees a blank canvas while the host
// is actively talking.

export class NvtView {
    /**
     * @param {HTMLElement} el
     * @param {(text:string)=>void} onSubmit  called when the user presses Enter
     */
    constructor (el, onSubmit) {
        this.el = el;
        this.onSubmit = onSubmit;
        this.text = '';
        this.lineBuffer = '';
        this.visible = false;
        // Allow user to click into the overlay to focus and type.
        el.addEventListener('keydown', (event) => this.#handleKey(event));
    }

    show () {
        if (this.visible) return;
        this.visible = true;
        this.el.classList.remove('hidden');
        this.el.focus();
    }

    hide () {
        if (!this.visible) return;
        this.visible = false;
        this.el.classList.add('hidden');
    }

    /** Append received bytes (already ASCII). Renders CR/LF naturally. */
    append (bytes) {
        let chunk = '';
        for (const b of bytes) {
            // Skip nulls; treat 0x07 (BEL), 0x0C (FF) as visible markers.
            if (b === 0x00) continue;
            chunk += String.fromCharCode(b);
        }
        this.text += chunk;
        this.el.textContent = this.text;
        this.show();
        this.el.scrollTop = this.el.scrollHeight;
    }

    clear () {
        this.text = '';
        this.lineBuffer = '';
        this.el.textContent = '';
    }

    #handleKey (event) {
        if (!this.visible) return;
        const k = event.key;
        // Stop propagation so the document-level InputController doesn't
        // also try to consume the same keystroke.
        const consume = () => { event.preventDefault(); event.stopPropagation(); };
        if (k === 'Enter') {
            consume();
            const line = this.lineBuffer + '\r\n';
            this.text += '\r\n';
            this.el.textContent = this.text;
            this.lineBuffer = '';
            this.onSubmit?.(line);
        } else if (k === 'Backspace') {
            consume();
            if (this.lineBuffer.length > 0) {
                this.lineBuffer = this.lineBuffer.slice(0, -1);
                this.text = this.text.slice(0, -1);
                this.el.textContent = this.text;
            }
        } else if (k.length === 1 && !event.metaKey && !event.ctrlKey) {
            consume();
            this.lineBuffer += k;
            this.text += k;
            this.el.textContent = this.text;
        }
    }
}
