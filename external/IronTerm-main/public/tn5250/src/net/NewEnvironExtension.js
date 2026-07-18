// TN5250 telnet extension - implements RFC 1572 (NEW-ENVIRON) with the
// 5250-specific variables documented in RFC 4777 ("IBM's iSeries Telnet
// Enhancements").
//
// Plugged into the shared TelnetCore. We don't add any data-stream
// header on the wire - the 5250 GDS header lives one layer up, inside
// the InboundParser / OutboundBuilder - so this extension is mostly
// about telling the IBM i / AS400 host who we are during negotiation.
//
// What the host typically asks for:
//   1. IAC DO  NEW-ENVIRON       → we answer IAC WILL
//   2. IAC SB  NEW-ENVIRON SEND IAC SE     (request for variable values)
//   3. We answer IAC SB NEW-ENVIRON IS <USERVAR/VAR entries> IAC SE
//
// USERVAR vs VAR matters: USERVAR is for variables defined by the
// implementation (everything 5250-specific), VAR is for "well-known"
// telnet variables (USER, JOB, etc. per RFC 1572).
//
// Optional fields (USER + IBMRSEED + IBMSUBSPW) drive password
// substitution for bypass-signon (RFC 4777 §5). When `password` is
// provided we MUST also have negotiated a server-supplied seed - we
// stub that for now and treat it as a literal pre-shared value. Real
// password substitution (DES MAC against the seed) lives in Signon.js
// and will be filled in a follow-up.

import { Telnet } from '../../../shared/src/proto/TelnetConstants.js';
import { TelnetOption, NewEnviron, Models } from '../proto/Constants.js';

const ASCII = new TextEncoder();

export class NewEnvironExtension {
    /**
     * @param {object} [opts]
     * @param {string} [opts.devName]   suggested workstation name (RFC 4777 DEVNAME)
     * @param {string} [opts.kbdType]   keyboard type, e.g. 'USB'
     * @param {string} [opts.codePage]  EBCDIC code page, e.g. '037'
     * @param {string} [opts.charset]   character set id, e.g. '697'
     * @param {string} [opts.user]      IBM i user profile for bypass-signon
     * @param {string} [opts.password]  plaintext password (only used if
     *                                  the host accepts it; for real
     *                                  password substitution we will
     *                                  add a hashed flow in Signon.js)
     * @param {string} [opts.library]   IBMCURLIB
     * @param {string} [opts.initialMenu] IBMIMENU
     * @param {string} [opts.program]   IBMPROGRAM
     */
    constructor (opts = {}) {
        this.core = null;
        this.OPTION = TelnetOption.NEW_ENVIRON;

        this.devName     = opts.devName     ?? '';
        this.kbdType     = opts.kbdType     ?? 'USB';
        this.codePage    = opts.codePage    ?? '037';
        this.charset     = opts.charset     ?? '697';
        this.user        = opts.user        ?? '';
        this.password    = opts.password    ?? '';
        this.library     = opts.library     ?? '';
        this.initialMenu = opts.initialMenu ?? '';
        this.program     = opts.program     ?? '';

        // Sequence counter for auto-bumping DEVNAME on host rejection.
        this.deviceSequence = 0;
    }

    attach (core) {
        this.core = core;
        core.state.newEnviron = false;
    }

    isKnownOption (opt) {
        return opt === this.OPTION;
    }

    onOptionEnabled (opt) {
        if (opt === this.OPTION) this.core.setState({ newEnviron: true });
    }
    onOptionDisabled (opt) {
        if (opt === this.OPTION) this.core.setState({ newEnviron: false });
    }

    // 5250 doesn't add anything to the record itself - the GDS header
    // is handled at the InboundParser / OutboundBuilder layer.
    wrapOutbound   (record) { return record; }
    unwrapInbound  (bytes)  { return { payload: bytes, meta: {} }; }

    // ---- subnegotiation ------------------------------------------------

    handleSubnegotiation (opt, data) {
        if (opt !== this.OPTION) return;

        // Layout: 0x27 <verb> [VAR|USERVAR <name> [VALUE <value>]...]
        const verb = data[1];
        if (verb === NewEnviron.SEND) {
            this.#sendIs();
        }
        // INFO and IS from the host are informational; we don't act.
    }

    /** Compose and send IAC SB NEW-ENVIRON IS <vars> IAC SE. */
    #sendIs () {
        const parts = [];
        parts.push(Telnet.IAC, Telnet.SB, this.OPTION, NewEnviron.IS);

        if (this.kbdType)
            this.#pushUserVar(parts, 'KBDTYPE', this.kbdType);
        if (this.codePage)
            this.#pushUserVar(parts, 'CODEPAGE', this.codePage);
        if (this.charset)
            this.#pushUserVar(parts, 'CHARSET', this.charset);
        if (this.devName)
            this.#pushUserVar(parts, 'DEVNAME', this.#nextDevName());
        // IBMSENDCONFREC = "YES" tells the IBM i to emit the startup
        // confirmation GDS record (miscFlags1 = 0x80). Without it the
        // host may skip the confirmation entirely - we always send this
        // for display sessions.
        this.#pushUserVar(parts, 'IBMSENDCONFREC', 'YES');

        // Bypass-signon block (RFC 4777 §5). When present, the host
        // signs the user in without showing the signon screen.
        if (this.user) {
            this.#pushVar(parts, 'USER', this.user);

            if (this.password) {
                // Phase 2a: send IBMRSEED with a placeholder zero seed
                // and IBMSUBSPW with the plaintext. The IBM i host
                // accepts this when QPWDRULES allows it. The full
                // DES-MAC-based password substitution moves to
                // Signon.js in a later phase.
                parts.push(NewEnviron.USERVAR);
                this.#pushBytes(parts, ASCII.encode('IBMRSEED'));
                parts.push(NewEnviron.VALUE);
                parts.push(NewEnviron.ESC, 0, 0, 0, 0, 0, 0, 0, 0);

                this.#pushUserVar(parts, 'IBMSUBSPW', this.password);
            }
            if (this.library)     this.#pushUserVar(parts, 'IBMCURLIB',  this.library);
            if (this.initialMenu) this.#pushUserVar(parts, 'IBMIMENU',   this.initialMenu);
            if (this.program)     this.#pushUserVar(parts, 'IBMPROGRAM', this.program);
        }

        parts.push(Telnet.IAC, Telnet.SE);
        this.core.send(Uint8Array.from(parts));
    }

    #pushUserVar (out, name, value) {
        out.push(NewEnviron.USERVAR);
        this.#pushBytes(out, ASCII.encode(name));
        out.push(NewEnviron.VALUE);
        this.#pushBytes(out, ASCII.encode(value));
    }

    #pushVar (out, name, value) {
        out.push(NewEnviron.VAR);
        this.#pushBytes(out, ASCII.encode(name));
        out.push(NewEnviron.VALUE);
        this.#pushBytes(out, ASCII.encode(value));
    }

    #pushBytes (out, bytes) {
        // RFC 1572 requires any byte equal to IAC (0xFF), ESC (0x02),
        // VAR (0x00), VALUE (0x01) or USERVAR (0x03) appearing inside a
        // variable name or value to be preceded by NewEnviron.ESC (0x02).
        // Doubling IAC also keeps the surrounding subneg frame intact.
        // (Same escaping rule documented in RFC 1572 §3.)
        for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i];
            if (b === 0x00 || b === 0x01 || b === 0x02 || b === 0x03) {
                out.push(NewEnviron.ESC);
            } else if (b === Telnet.IAC) {
                out.push(Telnet.IAC);
            }
            out.push(b);
        }
    }

    /** Append a sequence number on retries so the host gets a unique
     *  device name. The first attempt uses the bare name. */
    #nextDevName () {
        const base = this.devName;
        if (this.deviceSequence === 0) {
            this.deviceSequence++;
            return base;
        }
        return base + this.deviceSequence++;
    }

    // ---- helpers used by Terminal.js after a Reject ------------------

    /** Compute the next attempt to make if the host rejected DEVNAME
     *  during signon; the caller must reconnect. */
    bumpDeviceName () { this.deviceSequence++; }
}

/** Default kbdType / codepage / charset for the most common AS/400
 *  installs in Latin-1 territory; tweak via the toolbar profile. */
export const Tn5250Defaults = Object.freeze({
    KBDTYPE_USB:      'USB',
    CODEPAGE_037:     '037',     // US English
    CODEPAGE_500:     '500',     // International
    CODEPAGE_1141:    '1141',    // Austria/Germany (Euro)
    CHARSET_697_500:  '500',     // International char-set id
    CHARSET_697_697:  '697',
});

export { Models };
