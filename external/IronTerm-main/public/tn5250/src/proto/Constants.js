// Wire-protocol byte values for TN5250 / TN5250E and the 5250 datastream.
//
// Sources:
//   • RFC 1205 ("5250 Telnet Interface") - record framing, opcodes.
//   • RFC 4777 ("IBM's iSeries Telnet Enhancements") - NEW-ENVIRON
//     variables (DEVNAME, KBDTYPE, CODEPAGE, CHARSET, IBMRSEED,
//     IBMSUBSPWD, IBMCURLIB, IBMIMENU, IBMPROGRAM).
//   • IBM 5250 Functions Reference (SC30-3533) - canonical.
//
// Anything that is generic Telnet (IAC, DO/DONT, BINARY, EOR, TTYPE)
// lives in ../../../shared/src/proto/TelnetConstants.js so TN3270 and
// TN5250 can't drift on framing details.

import { TelnetOption as SharedTelnetOption } from '../../../shared/src/proto/TelnetConstants.js';

// ---- Telnet options (5250 adds NEW-ENVIRON) --------------------------
export const TelnetOption = Object.freeze({
    ...SharedTelnetOption,
    NEW_ENVIRON: 0x27,        // RFC 1572, decimal 39
});

// ---- NEW-ENVIRON subnegotiation (RFC 1572 + RFC 4777) ----------------
export const NewEnviron = Object.freeze({
    IS:       0x00,
    SEND:     0x01,
    INFO:     0x02,
    VAR:      0x00,           // "well-known" environment variable
    VALUE:    0x01,
    ESC:      0x02,           // escape for IAC inside a value
    USERVAR:  0x03,           // user-defined variable
});

// ---- 5250 GDS record header (RFC 1205 §3) ----------------------------
// 10-byte header preceding every record; total-length includes itself.
//
//   off  size  field
//    0    2    total length (big-endian)
//    2    2    0x12 0xA0  (GDS record type)
//    4    2    reserved (0x00 0x00)
//    6    1    variable header length (always 0x04)
//    7    1    flags        ERR / ATN / SRQ / TRQ / HLP (see Gds.Flag)
//    8    1    reserved (0x00)
//    9    1    opcode       (Gds.Op.*)
export const Gds = Object.freeze({
    HEADER_LEN: 10,
    TYPE_HI:    0x12,
    TYPE_LO:    0xA0,
    VARHDR_LEN: 0x04,

    Flag: Object.freeze({
        ERR: 0x80,
        ATN: 0x40,
        SRQ: 0x04,
        TRQ: 0x02,
        HLP: 0x01,
    }),

    Op: Object.freeze({
        NO_OPERATION:        0x00,    // also: client response data
        INVITE_OPERATION:    0x01,
        OUTPUT_ONLY:         0x02,
        PUT_GET_OPERATION:   0x03,
        SAVE_SCREEN:         0x04,
        RESTORE_SCREEN:      0x05,
        READ_IMMEDIATE:      0x06,
        READ_SCREEN:         0x08,
        CANCEL_INVITE:       0x0A,
        MESSAGE_LIGHT_ON:    0x0B,
        MESSAGE_LIGHT_OFF:   0x0C,
    }),
});

// ---- 5250 commands (inside an opcode 0x01/0x02/0x03 record payload) ---
export const Cmd = Object.freeze({
    SAVE_SCREEN:                 0x02,
    WRITE_TO_DISPLAY:            0x11,
    RESTORE_SCREEN:              0x12,
    CLEAR_UNIT_ALT:              0x20,
    WRITE_ERROR_CODE:            0x21,
    WRITE_ERROR_CODE_TO_WINDOW:  0x22,
    ROLL:                        0x23,
    CLEAR_UNIT:                  0x40,
    READ_INPUT_FIELDS:           0x42,
    CLEAR_FORMAT_TABLE:          0x50,
    READ_MDT_FIELDS:             0x52,
    READ_SCREEN_IMMEDIATE:       0x62,
    READ_SCREEN_TO_PRINT:        0x66,
    READ_MDT_IMMEDIATE_ALT:      0x83,
    WRITE_STRUCTURED_FIELD:      0xF3,
});

// ---- 5250 WTD orders (within a Write-To-Display payload) -------------
export const Order = Object.freeze({
    SOH:   0x01,    // Start of Header
    RA:    0x02,    // Repeat to Address
    EA:    0x03,    // Erase to Address
    ESC:   0x04,    // Command Escape (terminator)
    TD:    0x10,    // Transparent Data
    SBA:   0x11,    // Set Buffer Address
    WEA:   0x12,    // Write Extended Attribute
    IC:    0x13,    // Insert Cursor
    MC:    0x14,    // Move Cursor
    WTDSF: 0x15,    // Write To Display Structured Field (carries ENPTUI)
    SF:    0x1D,    // Start of Field
});

// ---- Basic attribute byte (0x20-0x3F) --------------------------------
// Any byte in this range, when encountered in a Write-to-Display stream,
// is treated as a non-display "attribute place" cell that controls the
// colour/highlight of every cell that follows until the next attribute.
// The lower 5 bits encode foreground colour + 4 modifier flags:
//   bit 4: column separator (CS)
//   bit 3: blink (BL)
//   bit 2: underline (UL)
//   bit 1: reverse-image (RI)
//   bit 0: non-display (ND)
// The four base colours are signalled by bits 4-2 according to the
// canonical table from the IBM 5250 reference.
export function isAttribute (b) {
    return ((b & 0xFF) & 0xE0) === 0x20;
}

// Maps a basic-attribute byte (0x20-0x3F) to a normalised description
// the renderer consumes. Values follow the canonical IBM 5250 colour
// table for IBM-3179-2 / IBM-3477 / IBM-5292-2 hardware (per the
// "AS/400 5250 Functions Reference").
//
// Encoding summary (bit-by-bit on the low 5 bits of the byte):
//
//   0x20 + abcde, where:
//     abc = colour group (000=green/red/turq/pink alternating, see table)
//     d   = highlight modifier within group (underline / blink / reverse)
//     e   = column-separator flag for some groups
//
// In practice the easiest reference is the table itself - we just
// mirror what real hardware does. Non-display attributes hide the
// glyph; reverse swaps fg/bg; underline / col-sep / blink stack.
function A (fg, opts = {}) {
    return Object.freeze({
        fg, bg: opts.bg ?? 'black',
        blink:     !!opts.blink,
        underline: !!opts.underline,
        reverse:   !!opts.reverse,
        hidden:    !!opts.hidden,
        colSep:    !!opts.colSep,
    });
}
// Each attribute byte applies to every following cell until the next
// attribute byte, per the IBM 5250 colour table for real IBM-3179-2 /
// IBM-3477 / IBM-5292-2 hardware. Some bytes share
// rendering: e.g. 0x28 and 0x2A both produce red-normal in hardware
// (the second bit doesn't change the visual on a colour 5250).
export const ATTR_BASE = Object.freeze({
    0x20: A('green'),
    0x21: A('green',     { reverse: true }),
    0x22: A('white'),
    0x23: A('white',     { reverse: true }),
    0x24: A('green',     { underline: true }),
    0x25: A('green',     { underline: true, reverse: true }),
    0x26: A('white',     { underline: true }),
    0x27: A('green',     { hidden: true }),
    0x28: A('red'),
    0x29: A('red',       { reverse: true }),
    0x2A: A('red'),                                     // alias of 0x28
    0x2B: A('red',       { reverse: true }),            // alias of 0x29
    0x2C: A('red',       { underline: true }),
    0x2D: A('red',       { underline: true, reverse: true }),
    0x2E: A('red',       { underline: true }),          // alias of 0x2C
    0x2F: A('red',       { hidden: true }),
    0x30: A('turquoise', { colSep: true }),
    0x31: A('turquoise', { colSep: true, reverse: true }),
    0x32: A('yellow',    { colSep: true }),
    0x33: A('yellow',    { colSep: true, reverse: true }),
    0x34: A('turquoise', { underline: true }),
    0x35: A('turquoise', { underline: true, reverse: true }),
    0x36: A('yellow',    { underline: true }),
    0x37: A('turquoise', { hidden: true }),
    0x38: A('pink'),
    0x39: A('pink',      { reverse: true }),
    0x3A: A('blue'),
    0x3B: A('blue',      { reverse: true }),
    0x3C: A('pink',      { underline: true }),
    0x3D: A('pink',      { underline: true, reverse: true }),
    0x3E: A('blue',      { underline: true }),
    0x3F: A('green',     { hidden: true, colSep: true }),
});

// ---- Field Format Word (FFW) flags ------------------------------------
// The FFW is a 16-bit word split across two bytes. Bit 0x40 of the first
// byte is the "FFW present" marker - when set, both FFW bytes plus any
// FCW pairs follow before the attribute byte and length. Field flags are
// spread across the two bytes; bit names and positions verified against
// the IBM 5250 reference.
//
//   First byte (`ffw0`):
//     0x40 = FFW marker
//     0x20 = bypass (input not allowed, cursor passes through)
//     0x10 = dup allowed
//     0x08 = MDT (modified-data tag)
//     0x07 = shift specification (low 3 bits — see Shift.*)
//
//   Second byte (`ffw1`):
//     0x80 = auto enter (submit when last position typed)
//     0x40 = field exit required (FER)
//     0x20 = monocase (force uppercase on typed alpha)
//     0x08 = mandatory enter (must have data to leave the field)
//     0x07 = adjustment / fill type (right-adjust, zero-fill, etc.)
export const Ffw = Object.freeze({
    BYPASS:        0x20,    // ffw0
    DUP_ALLOWED:   0x10,    // ffw0
    MDT:           0x08,    // ffw0
    SHIFT_NUMERIC: 0x07,    // ffw0 low 3 bits: shift/edit type, see Shift.*

    AUTO_ENTER:    0x80,    // ffw1
    FER:           0x40,    // ffw1: field-exit required
    MONOCASE:      0x20,    // ffw1: uppercase alpha on input
    MANDATORY:     0x08,    // ffw1
    ADJUST:        0x07,    // ffw1 low 3 bits: adjustment, see Adjust.*
});

export const Adjust = Object.freeze({
    NONE:         0x0,
    RIGHT_ZERO:   0x5,    // right-adjust, fill with EBCDIC zero
    RIGHT_BLANK:  0x6,    // right-adjust, fill with EBCDIC blank
    MANDATORY:    0x7,    // mandatory-fill (digits)
});

export const Shift = Object.freeze({
    DATA_ALL:        0x0,
    DATA_X:          0x1,   // alpha-only
    DATA_A:          0x2,   // alpha-shift
    DATA_N:          0x3,   // numeric-shift
    DATA_S:          0x4,   // numeric-only
    DATA_DIGITS:     0x5,
    DATA_DBCS:       0x6,
    DATA_SIGNED_N:   0x7,
});

// ---- AID-generating keys (RFC 1205 §5.4) -----------------------------
export const Aid = Object.freeze({
    PF1:  0x31, PF2:  0x32, PF3:  0x33, PF4:  0x34, PF5:  0x35, PF6:  0x36,
    PF7:  0x37, PF8:  0x38, PF9:  0x39, PF10: 0x3A, PF11: 0x3B, PF12: 0x3C,
    PF13: 0xB1, PF14: 0xB2, PF15: 0xB3, PF16: 0xB4, PF17: 0xB5, PF18: 0xB6,
    PF19: 0xB7, PF20: 0xB8, PF21: 0xB9, PF22: 0xBA, PF23: 0xBB, PF24: 0xBC,

    CLEAR:      0xBD,
    ENTER:      0xF1,
    HELP:       0xF3,
    // Per the IBM 5250 architecture document:
    //   AID_PAGEUP = 244 = 0xF4   (real keyboard "Page Up")
    //   AID_PAGEDW = 245 = 0xF5   (real keyboard "Page Down")
    //   AID_ROLLUP   = 245 = 0xF5  (roll content up   → bring NEXT page)
    //   AID_ROLLDOWN = 244 = 0xF4  (roll content down → bring PREV page)
    ROLL_DOWN:  0xF4,         // Page Up key  - bring previous page back
    ROLL_UP:    0xF5,         // Page Down key - bring next page forward
    ROLL_LEFT:  0xD9,
    ROLL_RIGHT: 0xDA,
    PRINT:      0xF6,
});

const AID_BY_NAME = Object.freeze({
    Enter: Aid.ENTER, Clear: Aid.CLEAR, Help: Aid.HELP, Print: Aid.PRINT,
    RollUp: Aid.ROLL_UP, RollDown: Aid.ROLL_DOWN,
    PF1: Aid.PF1,  PF2: Aid.PF2,  PF3: Aid.PF3,  PF4: Aid.PF4,
    PF5: Aid.PF5,  PF6: Aid.PF6,  PF7: Aid.PF7,  PF8: Aid.PF8,
    PF9: Aid.PF9,  PF10: Aid.PF10, PF11: Aid.PF11, PF12: Aid.PF12,
    PF13: Aid.PF13, PF14: Aid.PF14, PF15: Aid.PF15, PF16: Aid.PF16,
    PF17: Aid.PF17, PF18: Aid.PF18, PF19: Aid.PF19, PF20: Aid.PF20,
    PF21: Aid.PF21, PF22: Aid.PF22, PF23: Aid.PF23, PF24: Aid.PF24,
});
export function aidFromName (name) { return AID_BY_NAME[name] ?? null; }

// ---- Negative response sense codes (RFC 1205 §4) ---------------------
export const NegResp = Object.freeze({
    REQUEST_REJECT: 0x08,
    REQUEST_ERROR:  0x10,
    STATE_ERROR:    0x20,
    USAGE_ERROR:    0x40,
    PATH_ERROR:     0x80,
});

// ---- Models -----------------------------------------------------------
// The complete set of terminal types natively supported by TN5250
// (RFC 4777 §3.1 / IBM TN5250 specification). The TERMINAL-TYPE
// telnet option uses the `terminalType` field for negotiation.
//
//   24x80
//     IBM-5251-11   monochrome (the original 5251 model 11)
//     IBM-5291-1    monochrome
//     IBM-5292-2    colour, with graphics capability
//     IBM-3196-A1   monochrome
//     IBM-3179-2    colour
//
//   27x132
//     IBM-3180-2    monochrome
//     IBM-3477-FC   colour
//     IBM-3477-FG   monochrome
export const Models = Object.freeze({
    '5251-11': { rows: 24, cols:  80, terminalType: 'IBM-5251-11'  },
    '5291-1':  { rows: 24, cols:  80, terminalType: 'IBM-5291-1'   },
    '5292-2':  { rows: 24, cols:  80, terminalType: 'IBM-5292-2'   },
    '3196-A1': { rows: 24, cols:  80, terminalType: 'IBM-3196-A1'  },
    '3179-2':  { rows: 24, cols:  80, terminalType: 'IBM-3179-2'   },
    '3180-2':  { rows: 27, cols: 132, terminalType: 'IBM-3180-2'   },
    '3477-FC': { rows: 27, cols: 132, terminalType: 'IBM-3477-FC'  },
    '3477-FG': { rows: 27, cols: 132, terminalType: 'IBM-3477-FG'  },
});
