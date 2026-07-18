// IND$FILE - file transfer between mainframe and terminal.
//
// IND$FILE is the de facto file-transfer protocol on 3270. The user
// runs `IND$FILE GET dataset` (or PUT) on TSO/CMS/CICS; the host then
// runs the IND$FILE program which exchanges Write Structured Field
// records (SF type 0xD0) with the terminal. The terminal accumulates
// chunks (download) or sources them (upload), and acknowledges each.
//
// Wire format (SF body, after the 0xD0 type byte):
//
//   RT  ST  records...
//   ──  ──  ───────────────────────────────────────────
//   00  12  OPEN        (host: start transfer; body has FT:MSG or FT:DATA)
//   41  12  CLOSE       (host: finished)
//   46  11  upload req  (host: send next chunk)
//   47  04  download    (host: here is data; body has DataRecord)
//
// Each record after RT/ST is type-tagged:
//
//   01/09/0A/50   generic (length byte at +1, ignored)
//   03            ContentsRecord - "FT:MSG " or "FT:DATA"
//   08            RecordSize (max upload buffer)
//   63            RecordNumber (4-byte BE)
//   69            ErrorRecord (2-byte code: 2200=EOF, 4700=CANCEL)
//   C0            DataRecord - 5-byte header + raw buffer:
//                   C0 80 [00 compressed | 61 uncompressed]
//                   <total-len-hi> <total-len-lo> <buffer...>
//
// Reply format (sent as a Read SF record on the wire):
//
//   88 LL LL D0 cmd subcmd <records...>
//
// where LL LL is the SF length (everything after the AID byte).
//
// Common reply pairs:
//   00/09  ack OPEN
//   41/09  ack CLOSE
//   47/05 + RecordNumber  ack download buffer
//   46/05 + RecordNumber + DataRecord  send next upload chunk
//   46/08 + ErrorRecord(EOF)           upload complete

import { Aid } from './Constants.js';
import { debugFor } from '../../../shared/src/core/debug.js';

const log = debugFor('tn3270.indfile');

const TYPE = 0xD0;

// Record-type sub-bytes inside the SF body
const REC = Object.freeze({
    GEN1: 0x01, GEN9: 0x09, GENA: 0x0A, GEN50: 0x50,    // generic
    CONTENTS:    0x03,
    RECORDSIZE:  0x08,
    RECORDNUM:   0x63,
    ERROR:       0x69,
    DATA:        0xC0,
});

// Error codes inside an ErrorRecord (0x69)
const ERR = Object.freeze({
    EOF:        0x2200,
    CANCEL:     0x4700,
    CMD_FAILED: 0x0100,
});

// Outbound chunk size for IND$FILE inbound buffers.
const UPLOAD_CHUNK_SIZE = 2048;

function packU16 (out, p, value) {
    out[p]     = (value >> 8) & 0xFF;
    out[p + 1] =  value       & 0xFF;
}

function packU32 (out, p, value) {
    out[p]     = (value >> 24) & 0xFF;
    out[p + 1] = (value >> 16) & 0xFF;
    out[p + 2] = (value >>  8) & 0xFF;
    out[p + 3] =  value        & 0xFF;
}

/** Wraps an SF body into the full structured-field reply record:
 *      88 | LL LL | D0 | cmd | subcmd | extra...
 *  Caller passes only `extra` (post-subcmd bytes); the AID + length
 *  prefix + 0xD0 + cmd/subcmd are added here.
 *  Total bytes returned can be sent via TelnetStream.sendRecord. */
function wrapReply (cmd, subcmd, extra = null) {
    const extraLen = extra ? extra.length : 0;
    const total = 1 + 2 + 1 + 1 + 1 + extraLen;     // AID + LL + D0 + cmd + sub
    const out = new Uint8Array(total);
    out[0] = Aid.SF;                                 // 0x88
    packU16(out, 1, total - 1);                      // SF length excludes AID byte
    out[3] = TYPE;
    out[4] = cmd;
    out[5] = subcmd;
    if (extra) out.set(extra, 6);
    return out;
}

/** Sub-record builders --------------------------------------------- */

function recordNumber (n) {
    const r = new Uint8Array(6);
    r[0] = REC.RECORDNUM;
    r[1] = 6;                  // length field (TransferRecord convention)
    packU32(r, 2, n);
    return r;
}

function errorRecord (code) {
    const r = new Uint8Array(4);
    r[0] = REC.ERROR;
    r[1] = 4;
    packU16(r, 2, code);
    return r;
}

function dataRecord (chunk) {
    const r = new Uint8Array(5 + chunk.length);
    r[0] = 0xC0;
    r[1] = 0x80;
    r[2] = 0x61;                          // uncompressed
    packU16(r, 3, 5 + chunk.length);      // total length incl. header
    r.set(chunk, 5);
    return r;
}

/** State + protocol driver ----------------------------------------- */

export class IndFile {
    constructor () {
        this.reset();
        // Hooks for the Terminal: notified on transfer lifecycle events.
        this.onProgress = null;        // ({direction, bytes}) => void
        this.onComplete = null;        // ({direction, name, blob}) => void
        this.onError    = null;        // (msg) => void
        // Toggle to true (e.g. from devtools: `terminal.indFile.debug = true`)
        // for verbose console logging of every IND$FILE record + reply.
        this.debug = false;
    }

    #log (...args) {
        if (this.debug) log.log(...args);
    }

    reset () {
        // direction: null | 'download' | 'upload'
        this.direction = null;
        // 'idle' | 'open' | 'transferring' | 'closed'
        this.state = 'idle';
        // Whether host announced FT:DATA or FT:MSG (data ⇒ real file;
        // msg ⇒ a status string we just print to the console).
        this.contents = null;          // 'data' | 'msg' | null
        // Download accumulation
        this.downloadChunks = [];
        this.downloadBytes = 0;
        // Upload pending data (queued by the UI before user types
        // IND$FILE PUT). Flat Uint8Array, advanced by uploadOffset.
        this.uploadBuffer = null;
        this.uploadOffset = 0;
        this.uploadFileName = null;
        // Replies built by process() that the Terminal must send.
        this.pendingReplies = [];
        // Filename suggestion the Terminal hands to the browser on
        // download. Defaults to "transfer.bin" if we never figure one.
        this.suggestedName = null;
    }

    /** Caller queues a file the user picked. The actual transfer doesn't
     *  start until the host sends OPEN - at which point we'll start
     *  feeding chunks in response to upload-request records. */
    queueUpload (bytes, fileName) {
        this.uploadBuffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        this.uploadOffset = 0;
        this.uploadFileName = fileName ?? null;
    }

    /** True when an upload is queued and waiting for the host to ask. */
    get hasPendingUpload () {
        return this.uploadBuffer !== null && this.uploadOffset === 0;
    }

    /** Process one D0 structured-field body (everything after the
     *  enclosing WSF length / type bytes). Returns nothing; call
     *  drainReplies() to retrieve any responses.                       */
    process (body) {
        if (body.length < 2) return;
        const rectype = body[0];
        const subtype = body[1];

        // Walk sub-records starting at offset 2.
        const records = this.#parseSubRecords(body, 2);

        const hex = Array.from(body).slice(0, 32).map(b => b.toString(16).padStart(2, '0')).join(' ');
        this.#log(`recv  RT=${rectype.toString(16).padStart(2,'0')} ST=${subtype.toString(16).padStart(2,'0')} ` +
            `len=${body.length} subrecs=[${records.map(r => r.tag.toString(16)).join(',')}] body=${hex}${body.length>32?' …':''}`);

        switch (rectype) {
            case 0x00:                       // OPEN
                if (subtype === 0x12) this.#open(records);
                else this.#log(`unexpected OPEN subtype ${subtype.toString(16)}`);
                break;
            case 0x41:                       // CLOSE
                if (subtype === 0x12) this.#close();
                else this.#log(`unexpected CLOSE subtype ${subtype.toString(16)}`);
                break;
            case 0x46:                       // upload data buffer request
                if (subtype === 0x11) this.#sendUploadChunk();
                else this.#log(`unexpected upload subtype ${subtype.toString(16)}`);
                break;
            case 0x47:                       // download data
                if (subtype === 0x04) this.#receiveDownloadChunk(records);
                else this.#log(`unexpected download subtype ${subtype.toString(16)}`);
                break;
            default:
                this.#log(`UNHANDLED rectype ${rectype.toString(16)}/${subtype.toString(16)}`);
                break;
        }

        if (this.pendingReplies.length > 0) {
            for (const r of this.pendingReplies) {
                const rhex = Array.from(r).slice(0, 16).map(b => b.toString(16).padStart(2,'0')).join(' ');
                this.#log(`reply ${rhex}${r.length>16?' …':''} (${r.length}b)`);
            }
        } else {
            this.#log('no reply queued');
        }
    }

    /** Pop accumulated replies that the Terminal must send back. */
    drainReplies () {
        const out = this.pendingReplies;
        this.pendingReplies = [];
        return out;
    }

    // ---- Sub-record parsing -------------------------------------------

    #parseSubRecords (body, start) {
        const out = [];
        let p = start;
        while (p < body.length) {
            const tag = body[p];
            // Only the DATA record (0xC0) has a different length encoding -
            // 5-byte header where bytes 3-4 are total length.
            if (tag === REC.DATA) {
                const total = ((body[p + 3] & 0xFF) << 8) | (body[p + 4] & 0xFF);
                const end = Math.min(p + total, body.length);
                out.push({ tag, header: body.subarray(p, p + 5), data: body.subarray(p + 5, end) });
                p = end;
            } else {
                // Most records put their length in byte 1.
                const len = body[p + 1] & 0xFF;
                if (len < 2 || p + len > body.length) break;
                out.push({ tag, bytes: body.subarray(p, p + len) });
                p += len;
            }
        }
        return out;
    }

    #findContents (records) {
        for (const r of records) {
            if (r.tag !== REC.CONTENTS) continue;
            const text = String.fromCharCode(...r.bytes.subarray(2, 9));
            if (text === 'FT:MSG ') return 'msg';
            if (text === 'FT:DATA') return 'data';
        }
        return null;
    }

    // ---- Protocol handlers --------------------------------------------

    #open (records) {
        // Direction is implied by which records the host includes:
        //   contents=DATA + RecordSize → upload
        //   contents=DATA (no RecordSize) → download
        //   contents=MSG → message only (host wants to print a string)
        this.contents = this.#findContents(records);
        const hasRecordSize = records.some(r => r.tag === REC.RECORDSIZE);

        if (this.contents === 'msg') {
            // Message exchange - host is going to send DATA records that
            // we should treat as a status string. Direction is "download"
            // for parsing purposes.
            this.direction = 'download';
            this.downloadChunks = [];
            this.downloadBytes = 0;
        } else if (hasRecordSize) {
            this.direction = 'upload';
            if (!this.uploadBuffer) {
                this.onError?.('Host requested upload but no file is queued - pick a file first');
                this.#abort(ERR.CANCEL);
                return;
            }
            this.uploadOffset = 0;
        } else {
            this.direction = 'download';
            this.downloadChunks = [];
            this.downloadBytes = 0;
        }
        this.state = 'open';
        this.pendingReplies.push(wrapReply(0x00, 0x09));
    }

    #receiveDownloadChunk (records) {
        // The relevant sub-record is the DataRecord (0xC0). We don't
        // implement the stream-compression scheme (byte-replication) so
        // we only accept uncompressed buffers - uncompressed is the
        // default for IND$FILE without the COMP option.
        const rec = records.find(r => r.tag === REC.DATA);
        if (!rec) return;
        const compressed = rec.header[2] === 0x00;
        if (compressed) {
            this.onError?.('Compressed IND$FILE buffers are not supported - use IND$FILE GET ... ASCII (or no COMP option)');
            this.#abort(ERR.CANCEL);
            return;
        }
        if (this.contents === 'msg') {
            // Status-message transfer - concatenate as MSG text and end.
            this.downloadChunks.push(rec.data);
            this.downloadBytes += rec.data.length;
        } else {
            this.downloadChunks.push(rec.data);
            this.downloadBytes += rec.data.length;
            this.state = 'transferring';
            this.onProgress?.({ direction: 'download', bytes: this.downloadBytes });
        }
        // ACK with the buffer number (1-based count of received buffers).
        this.pendingReplies.push(wrapReply(0x47, 0x05, recordNumber(this.downloadChunks.length)));
    }

    #sendUploadChunk () {
        if (!this.uploadBuffer) {
            this.#abort(ERR.CANCEL);
            return;
        }
        const remaining = this.uploadBuffer.length - this.uploadOffset;
        if (remaining <= 0) {
            // Out of data → tell host EOF (46/08 + ErrorRecord(EOF)).
            this.pendingReplies.push(wrapReply(0x46, 0x08, errorRecord(ERR.EOF)));
            return;
        }
        const take = Math.min(UPLOAD_CHUNK_SIZE, remaining);
        const chunk = this.uploadBuffer.subarray(this.uploadOffset, this.uploadOffset + take);
        this.uploadOffset += take;
        this.state = 'transferring';
        this.onProgress?.({ direction: 'upload', bytes: this.uploadOffset });

        // Reply: 46/05 + RecordNumber(buffer-index) + DataRecord.
        const rn = recordNumber(Math.ceil(this.uploadOffset / UPLOAD_CHUNK_SIZE));
        const dr = dataRecord(chunk);
        const extra = new Uint8Array(rn.length + dr.length);
        extra.set(rn, 0);
        extra.set(dr, rn.length);
        this.pendingReplies.push(wrapReply(0x46, 0x05, extra));
    }

    #close () {
        const direction = this.direction;
        const wasMessage = this.contents === 'msg';
        // Always ACK the close - even on aborted transfers, hosts expect it.
        this.pendingReplies.push(wrapReply(0x41, 0x09));

        if (direction === 'download' && !wasMessage) {
            const blob = this.#joinDownload();
            this.onComplete?.({
                direction: 'download',
                name: this.suggestedName ?? 'transfer.bin',
                blob,
            });
        } else if (direction === 'upload') {
            this.onComplete?.({
                direction: 'upload',
                name: this.uploadFileName ?? '',
                bytes: this.uploadOffset,
            });
        } else if (wasMessage) {
            const text = new TextDecoder('latin1').decode(this.#joinDownload());
            this.onError?.(`IND$FILE: ${text}`);
        }
        this.reset();
    }

    #joinDownload () {
        const out = new Uint8Array(this.downloadBytes);
        let p = 0;
        for (const c of this.downloadChunks) {
            out.set(c, p);
            p += c.length;
        }
        return new Blob([out], { type: 'application/octet-stream' });
    }

    #abort (errCode) {
        // Send a single error record to the host so it tears down the
        // transfer cleanly on its side.
        this.pendingReplies.push(wrapReply(0x47, 0x08, errorRecord(errCode)));
        this.reset();
    }

    /** Set the suggested filename for the next download (called by UI
     *  when it can infer from the user's IND$FILE GET command).        */
    setSuggestedName (name) {
        this.suggestedName = name;
    }
}

export const IndFileSF_TYPE = TYPE;
