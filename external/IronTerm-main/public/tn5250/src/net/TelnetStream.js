// TN5250 telnet adapter - composes the shared TelnetCore (generic IAC /
// EOR framing, BINARY / EOR / TERMINAL-TYPE, NOP keepalive) with
// NewEnvironExtension (option 0x27 + RFC 4777 variables).
//
// 5250 records carry a GDS header (handled one layer up in
// proto/GdsHeader.js); this class hands raw record payloads to its
// listener unmodified.

import { TelnetCore } from '../../../shared/src/net/TelnetCore.js';
import { NewEnvironExtension } from './NewEnvironExtension.js';

export class TelnetStream {
    /**
     * @param {object} opts                 see TelnetCore
     * @param {string} [opts.terminalType]  e.g. 'IBM-3477-FC'
     * @param {object} [opts.envOptions]    forwarded to NewEnvironExtension
     */
    constructor (opts) {
        this.env = new NewEnvironExtension(opts.envOptions ?? {});
        this.core = new TelnetCore({
            ...opts,
            extension: this.env,
        });
    }

    // ---- pass-through API ---------------------------------------------

    feed (b)         { this.core.feed(b); }
    close ()         { this.core.close(); }
    sendRecord (rec) { this.core.sendRecord(rec); }
    sendNvtText (s)  { this.core.sendNvtText(s); }

    get isNvt () { return this.core.isNvt; }
    get state () { return this.core.state; }
}
