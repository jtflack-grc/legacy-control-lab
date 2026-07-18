// Thin wrapper around a WebSocket configured for binary frames. The
// upstream service is a websockify-style relay: every binary frame
// carries raw TCP bytes from / to the mainframe.

export class WebSocketTransport {
    /**
     * @param {string} url           ws:// or wss:// URL of the bridge
     * @param {object} handlers
     * @param {()=>void}                  handlers.onOpen
     * @param {(b:Uint8Array)=>void}      handlers.onData
     * @param {(reason:string)=>void}     handlers.onClose
     * @param {(err:string)=>void}        handlers.onError
     * @param {string|string[]}           [handlers.protocols]   websocket subprotocols
     */
    constructor (url, handlers) {
        this.url = url;
        this.handlers = handlers;
        this.ws = null;
    }

    open () {
        // The 'binary' subprotocol is what websockify uses for raw TCP.
        // Some bridges use 'binary.tn3270', so accept either when the
        // caller passes one explicitly; otherwise default to 'binary'.
        const protocols = this.handlers.protocols ?? 'binary';
        const ws = new WebSocket(this.url, protocols);
        ws.binaryType = 'arraybuffer';
        this.ws = ws;

        ws.addEventListener('open',    () => this.handlers.onOpen?.());
        ws.addEventListener('message', (ev) => {
            if (typeof ev.data === 'string') {
                // Bridges sometimes send an unsolicited text greeting; ignore.
                return;
            }
            this.handlers.onData?.(new Uint8Array(ev.data));
        });
        ws.addEventListener('close',   (ev) => {
            this.handlers.onClose?.(ev.reason || `code ${ev.code}`);
        });
        ws.addEventListener('error',   () => {
            this.handlers.onError?.('websocket error');
        });
    }

    /** Send raw bytes. No-op when not connected. */
    send (bytes) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            // Slice to a fresh buffer so the WebSocket implementation
            // can't see (and freeze) data the caller still owns.
            this.ws.send(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
        }
    }

    close () {
        if (!this.ws) return;
        try { this.ws.close(); } catch { /* ignore */ }
        this.ws = null;
    }

    get isOpen () {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}
