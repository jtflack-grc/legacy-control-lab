// TN3270 / TN3270E-specific telnet behaviour, plugged into the shared
// TelnetCore. Owns:
//
//   • The TN3270E sub-option byte (0x28) and its SB DEVICE-TYPE /
//     FUNCTIONS dance (RFC 2355 §3.2).
//   • The 5-byte data-stream header that wraps every record once
//     TN3270E is active (data-type, request-flag, response-flag, seq).
//   • The positive / negative response records that the host expects
//     after it asks for one (RFC 2355 §5.4).
//
// All raw byte I/O still goes through TelnetCore; this class just maps
// host protocol semantics to its hooks.

import { Telnet } from '../../../shared/src/proto/TelnetConstants.js';
import { asciiDecode } from '../../../shared/src/net/TelnetCore.js';
import { TelnetOption, Tn3270e, TnHeader } from '../proto/Constants.js';

export class Tn3270eExtension {
    constructor () {
        this.core = null;

        // Sub-option byte advertised by the host as DO 0x28.
        this.OPTION = TelnetOption.TN3270E;

        // Per-record outbound sequence number (RFC 2355 §3.2: unique,
        // monotonically increasing, wraps at 0xFFFF).
        this.outboundSeq = 0;

        // Negotiated state mirrored into core.state so listeners only
        // need to look in one place.
        this.tn3270e    = false;
        this.deviceType = '';
        this.functions  = [];
    }

    attach (core) {
        this.core = core;
        core.state.tn3270e    = false;
        core.state.deviceType = '';
        core.state.functions  = [];
    }

    isKnownOption (opt) {
        return opt === this.OPTION;
    }

    onOptionEnabled (opt) {
        if (opt === this.OPTION) {
            this.tn3270e = true;
            this.core.setState({ tn3270e: true });
        }
    }
    onOptionDisabled (opt) {
        if (opt === this.OPTION) {
            this.tn3270e = false;
            this.core.setState({ tn3270e: false });
        }
    }

    /** Returns the bytes to prepend onto an outbound record. While
     *  TN3270E is off (plain TN3270) we add nothing - same record goes
     *  out as a bare datastream. */
    wrapOutbound (record) {
        if (!this.tn3270e) return record;

        this.outboundSeq = (this.outboundSeq + 1) & 0xFFFF;
        const seq = this.outboundSeq;
        const out = new Uint8Array(TnHeader.LENGTH + record.length);
        out[0] = TnHeader.TYPE_3270_DATA;
        out[1] = 0x00;                        // request-flag
        out[2] = 0x00;                        // response-flag (NO_RESPONSE)
        out[3] = (seq >> 8) & 0xFF;
        out[4] =  seq       & 0xFF;
        out.set(record, TnHeader.LENGTH);
        return out;
    }

    /** Strip the 5-byte header (if any) and attach per-record metadata.
     *  Returns null to drop records the upper layer can't render
     *  (BIND-IMAGE / UNBIND / NVT / SSCP-LU reach us once BIND-IMAGE is
     *  in the FUNCTIONS list; we don't implement SNA bind state). */
    unwrapInbound (bytes) {
        if (!this.tn3270e) {
            // Plain TN3270 (no header) - feed everything to the 3270 layer.
            return { payload: bytes, meta: { dataType: TnHeader.TYPE_3270_DATA, seq: 0, responseFlag: 0 } };
        }

        if (bytes.length < TnHeader.LENGTH) return null;
        const dataType     = bytes[0];
        const requestFlag  = bytes[1];   void requestFlag;
        const responseFlag = bytes[2];
        const seq          = (bytes[3] << 8) | bytes[4];
        const payload      = bytes.subarray(TnHeader.LENGTH);

        if (dataType !== TnHeader.TYPE_3270_DATA) return null;
        return { payload, meta: { dataType, seq, responseFlag } };
    }

    // ---- subnegotiation -----------------------------------------------

    handleSubnegotiation (opt, data) {
        if (opt !== this.OPTION) return;

        const op    = data[1];
        const subOp = data[2];

        // Host: SEND DEVICE-TYPE → respond with DEVICE-TYPE REQUEST <type>.
        if (op === Tn3270e.SEND && subOp === Tn3270e.DEVICE_TYPE) {
            const name = new TextEncoder().encode(this.core.terminalType);
            const out = new Uint8Array(5 + name.length + 2);
            let p = 0;
            out[p++] = Telnet.IAC; out[p++] = Telnet.SB;
            out[p++] = TelnetOption.TN3270E;
            out[p++] = Tn3270e.DEVICE_TYPE;
            out[p++] = Tn3270e.REQUEST;
            out.set(name, p); p += name.length;
            out[p++] = Telnet.IAC; out[p++] = Telnet.SE;
            this.core.send(out);
            return;
        }

        // Host: DEVICE-TYPE IS <name> [0x01 <luname>]
        if (op === Tn3270e.DEVICE_TYPE && subOp === Tn3270e.IS) {
            let sep = -1;
            for (let i = 3; i < data.length; i++)
                if (data[i] === 0x01) { sep = i; break; }
            const end = sep === -1 ? data.length : sep;
            this.deviceType = asciiDecode(data.slice(3, end));
            this.core.setState({ deviceType: this.deviceType });

            // Request the standard function set: BIND-IMAGE, RESPONSES, SYSREQ.
            const fns = [Tn3270e.FN_BIND_IMAGE, Tn3270e.FN_RESPONSES, Tn3270e.FN_SYSREQ];
            const out = new Uint8Array(5 + fns.length + 2);
            let p = 0;
            out[p++] = Telnet.IAC; out[p++] = Telnet.SB;
            out[p++] = TelnetOption.TN3270E;
            out[p++] = Tn3270e.FUNCTIONS;
            out[p++] = Tn3270e.REQUEST;
            for (const f of fns) out[p++] = f;
            out[p++] = Telnet.IAC; out[p++] = Telnet.SE;
            this.core.send(out);
            return;
        }

        // Host: FUNCTIONS REQUEST <list> - host counter-proposed; accept
        // its list verbatim by echoing as IS.
        if (op === Tn3270e.FUNCTIONS && subOp === Tn3270e.REQUEST) {
            const out = new Uint8Array(data.length + 4);
            let p = 0;
            out[p++] = Telnet.IAC; out[p++] = Telnet.SB;
            out.set(data, p); p += data.length;
            out[2 + 2] = Tn3270e.IS;            // overwrite the REQUEST sub-op
            out[p++] = Telnet.IAC; out[p++] = Telnet.SE;
            this.core.send(out);
            this.functions = Array.from(data.slice(3));
            this.core.setState({ functions: this.functions });
            return;
        }

        // Host: FUNCTIONS IS <list> - agreement; nothing to do but record.
        if (op === Tn3270e.FUNCTIONS && subOp === Tn3270e.IS) {
            this.functions = Array.from(data.slice(3));
            this.core.setState({ functions: this.functions });
            return;
        }
    }

    // ---- response records ---------------------------------------------

    /** Echo a successful record with an empty body. Caller picks the
     *  right time (after parsing succeeded) and passes the host's seq. */
    sendPositiveResponse (seq) {
        const out = new Uint8Array(7);
        out[0] = TnHeader.TYPE_RESPONSE;
        out[1] = 0x00;        // POSITIVE
        out[2] = 0x00;
        out[3] = (seq >> 8) & 0xFF;
        out[4] =  seq       & 0xFF;
        out[5] = Telnet.IAC;
        out[6] = Telnet.EOR;
        this.core.send(out);
    }

    /** Reject a record we couldn't process. `senseCode` is one byte -
     *  RFC 2355 §5.4 leaves the values implementation-defined; common
     *  values used by other implementations:
     *    0x10  function not supported / generic input error
     *    0x08  operation check / sequence error
     *  Hosts care more about *whether* a negative response arrives than
     *  the sense byte itself; our default is 0x10. */
    sendNegativeResponse (seq, senseCode = 0x10) {
        const out = new Uint8Array(8);
        out[0] = TnHeader.TYPE_RESPONSE;
        out[1] = 0x00;
        out[2] = 0x01;        // NEGATIVE
        out[3] = (seq >> 8) & 0xFF;
        out[4] =  seq       & 0xFF;
        out[5] = senseCode & 0xFF;
        out[6] = Telnet.IAC;
        out[7] = Telnet.EOR;
        this.core.send(out);
    }
}
