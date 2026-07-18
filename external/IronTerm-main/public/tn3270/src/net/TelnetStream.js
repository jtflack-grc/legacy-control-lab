// TN3270 telnet adapter: composes the shared TelnetCore (generic IAC /
// EOR framing, BINARY / EOR / TERMINAL-TYPE negotiation, NOP keepalive)
// with Tn3270eExtension (sub-option 0x28 + 5-byte data-stream header +
// positive/negative response records).
//
// Kept as its own class so Terminal.js keeps the same surface it had
// before the refactor: feed/send/sendRecord/sendNvtText/close plus the
// TN3270E-specific positive/negative response helpers.

import { TelnetCore } from '../../../shared/src/net/TelnetCore.js';
import { Tn3270eExtension } from './Tn3270eExtension.js';
import { Models } from '../proto/Constants.js';

export class TelnetStream {
    /**
     * @param {object}   opts                 see TelnetCore
     * @param {string}   [opts.terminalType]  e.g. "IBM-3278-2-E"
     */
    constructor (opts) {
        this.tn3270e = new Tn3270eExtension();
        this.core = new TelnetCore({
            ...opts,
            terminalType: opts.terminalType ?? Models[2].terminalType,
            extension: this.tn3270e,
        });
    }

    // ---- pass-through API ---------------------------------------------

    feed (b)              { this.core.feed(b); }
    close ()              { this.core.close(); }
    sendRecord (rec)      { this.core.sendRecord(rec); }
    sendNvtText (s)       { this.core.sendNvtText(s); }

    sendPositiveResponse (seq)            { this.tn3270e.sendPositiveResponse(seq); }
    sendNegativeResponse (seq, sense)     { this.tn3270e.sendNegativeResponse(seq, sense); }

    get isNvt () { return this.core.isNvt; }
    get state () { return this.core.state; }
}
