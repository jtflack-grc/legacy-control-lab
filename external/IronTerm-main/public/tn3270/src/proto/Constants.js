// All wire-protocol byte values for TN3270E and the 3270 datastream -
// kept in one place so the parser, the writer, and the negotiation
// layer can never disagree about what a byte means.
//
// The generic Telnet bits (IAC, DO/DONT/WILL/WONT, SB/SE, BINARY,
// EOR, TERMINAL-TYPE) live in ../../../shared/src/proto/TelnetConstants.js
// since they are identical for TN5250.

import { TelnetOption as SharedTelnetOption } from '../../../shared/src/proto/TelnetConstants.js';

// ---- Telnet option byte for TN3270E -----------------------------------
// Re-exported here as a frozen extension of the shared option set so old
// callers keep working and new ones see the full picture.
export const TelnetOption = Object.freeze({
    ...SharedTelnetOption,
    TN3270E: 0x28,
});

// ---- TN3270E subnegotiation (RFC 2355) ---------------------------------
export const Tn3270e = Object.freeze({
    ASSOCIATE:   0x00,
    CONNECT:     0x01,
    DEVICE_TYPE: 0x02,
    FUNCTIONS:   0x03,
    IS:          0x04,
    REASON:      0x05,
    REJECT:      0x06,
    REQUEST:     0x07,
    SEND:        0x08,
    // function codes (FUNCTIONS sub-list)
    FN_BIND_IMAGE: 0x00,
    FN_DATA_STREAM_CTL: 0x01,
    FN_RESPONSES: 0x02,
    FN_SCS_CTL_CODES: 0x03,
    FN_SYSREQ: 0x04,
});

// ---- TN3270E 5-byte data-stream header --------------------------------
// data-type (1) | request-flag (1) | response-flag (1) | seq-number (2)
export const TnHeader = Object.freeze({
    // DATA-TYPE values
    TYPE_3270_DATA: 0x00,
    TYPE_SCS_DATA:  0x01,
    TYPE_RESPONSE:  0x02,
    TYPE_BIND_IMAGE: 0x03,
    TYPE_UNBIND:    0x04,
    TYPE_NVT_DATA:  0x05,
    TYPE_REQUEST:   0x06,
    TYPE_SSCP_LU_DATA: 0x07,
    TYPE_PRINT_EOJ: 0x08,
    LENGTH: 5,
});

// ---- 3270 host-to-terminal commands ------------------------------------
// Two encodings exist depending on attachment style: SNA EBCDIC (F1/F5/...)
// for remote-attached devices, and CCW opcodes (01/05/...) for local
// channel-attached devices. Both are accepted in the data stream.
export const Cmd = Object.freeze({
    W_F1:                0xF1,   W_01:                0x01,  // Write
    EW_F5:               0xF5,   EW_05:               0x05,  // Erase Write
    EWA_7E:              0x7E,   EWA_0D:              0x0D,  // Erase Write Alternate
    EAU_6F:              0x6F,   EAU_0F:              0x0F,  // Erase All Unprotected
    WSF_F3:              0xF3,   WSF_11:              0x11,  // Write Structured Field
    RB_F2:               0xF2,   RB_02:               0x02,  // Read Buffer
    RM_F6:               0xF6,   RM_06:               0x06,  // Read Modified
    RMA_6E:              0x6E,   RMA_0E:              0x0E,  // Read Modified All
});

export function isWriteCommand (b) {
    return b === Cmd.W_F1 || b === Cmd.W_01
        || b === Cmd.EW_F5 || b === Cmd.EW_05
        || b === Cmd.EWA_7E || b === Cmd.EWA_0D;
}
export function isEraseWrite (b) {
    return b !== Cmd.W_F1 && b !== Cmd.W_01;
}
export function isAlternate (b) {
    return b === Cmd.EWA_7E || b === Cmd.EWA_0D;
}

// ---- 3270 orders -------------------------------------------------------
export const Order = Object.freeze({
    PT:  0x05,   // Program Tab
    GE:  0x08,   // Graphics Escape
    SBA: 0x11,   // Set Buffer Address
    EUA: 0x12,   // Erase Unprotected to Address
    IC:  0x13,   // Insert Cursor
    SF:  0x1D,   // Start Field
    SA:  0x28,   // Set Attribute
    SFE: 0x29,   // Start Field Extended
    MF:  0x2C,   // Modify Field
    RA:  0x3C,   // Repeat to Address
    // Format-control orders (treated as plain bytes by the buffer)
    NUL: 0x00,
    SUB: 0x3F,
    DUP: 0x1C,
    FM:  0x1E,
    FF:  0x0C,
    CR:  0x0D,
    NL:  0x15,
    EM:  0x19,
    EO:  0xFF,
});

// Bytes that terminate a TextOrder (i.e. are themselves orders).
export const ORDER_BYTES = new Set([
    Order.PT, Order.GE, Order.SBA, Order.EUA, Order.IC, Order.SF, Order.SA,
    Order.SFE, Order.MF, Order.RA,
    Order.NUL, Order.SUB, Order.DUP, Order.FM, Order.FF, Order.CR, Order.NL,
    Order.EM, Order.EO,
]);

// ---- Extended-attribute codes (used by SFE / SA / MF) -----------------
export const Attr = Object.freeze({
    XA_RESET:        0x00,
    XA_HIGHLIGHTING: 0x41,
    XA_FOREGROUND:   0x42,
    XA_CHARSET:      0x43,
    XA_BACKGROUND:   0x45,
    XA_TRANSPARENCY: 0x46,
    XA_START_FIELD:  0xC0,
    XA_VALIDATION:   0xC1,
    XA_OUTLINING:    0xC2,
});

// Highlight values
export const Hl = Object.freeze({
    DEFAULT:    0x00,
    NORMAL:     0xF0,
    BLINK:      0xF1,
    REVERSE:    0xF2,
    UNDERSCORE: 0xF4,
    INTENSIFY:  0xF8,
});

// ---- Write Control Character (WCC) bits -------------------------------
export const Wcc = Object.freeze({
    RESET_PARTITION: 0x40,
    START_PRINTER:   0x08,
    SOUND_ALARM:     0x04,
    RESTORE_KEYBD:   0x02,
    RESET_MDT:       0x01,
});

// ---- AID (Attention IDentifier) bytes ---------------------------------
export const Aid = Object.freeze({
    NO_AID:           0x60,
    NO_AID_PRINTER:   0xE8,
    SF:               0x88,        // structured-field reply
    READ_PARTITION:   0x61,
    CLEAR_PARTITION:  0x6A,
    PA3:              0x6B,
    PA1:              0x6C,
    CLEAR:            0x6D,
    PA2:              0x6E,
    ENTER:            0x7D,
    PF1:  0xF1, PF2:  0xF2, PF3:  0xF3, PF4:  0xF4,
    PF5:  0xF5, PF6:  0xF6, PF7:  0xF7, PF8:  0xF8,
    PF9:  0xF9, PF10: 0x7A, PF11: 0x7B, PF12: 0x7C,
    PF13: 0xC1, PF14: 0xC2, PF15: 0xC3, PF16: 0xC4,
    PF17: 0xC5, PF18: 0xC6, PF19: 0xC7, PF20: 0xC8,
    PF21: 0xC9, PF22: 0x4A, PF23: 0x4B, PF24: 0x4C,
});

const AID_BY_NAME = Object.freeze({
    Enter: Aid.ENTER, Clear: Aid.CLEAR,
    PA1: Aid.PA1, PA2: Aid.PA2, PA3: Aid.PA3,
    PF1:  Aid.PF1,  PF2:  Aid.PF2,  PF3:  Aid.PF3,  PF4:  Aid.PF4,
    PF5:  Aid.PF5,  PF6:  Aid.PF6,  PF7:  Aid.PF7,  PF8:  Aid.PF8,
    PF9:  Aid.PF9,  PF10: Aid.PF10, PF11: Aid.PF11, PF12: Aid.PF12,
    PF13: Aid.PF13, PF14: Aid.PF14, PF15: Aid.PF15, PF16: Aid.PF16,
    PF17: Aid.PF17, PF18: Aid.PF18, PF19: Aid.PF19, PF20: Aid.PF20,
    PF21: Aid.PF21, PF22: Aid.PF22, PF23: Aid.PF23, PF24: Aid.PF24,
});
export function aidFromName (name) { return AID_BY_NAME[name] ?? null; }
export function isShortReadAid (aid) {
    return aid === Aid.PA1 || aid === Aid.PA2 || aid === Aid.PA3 || aid === Aid.CLEAR;
}

// ---- Structured field type bytes --------------------------------------
export const Sf = Object.freeze({
    RESET_PARTITION:    0x00,
    READ_PARTITION:     0x01,
    ERASE_RESET:        0x03,
    SET_REPLY_MODE:     0x09,
    OUTBOUND_3270DS:    0x40,
    INBOUND_3270DS:     0x80,
    QUERY_REPLY:        0x81,
    IND_FILE:           0xD0,    // IND$FILE file transfer
});

// Query Reply field types we emit
export const QR = Object.freeze({
    SUMMARY:        0x80,
    USABLE_AREA:    0x81,
    CHARACTER_SETS: 0x85,
    COLOR:          0x86,
    HIGHLIGHT:      0x87,
    REPLY_MODES:    0x88,
    OEM_AUX:        0x8F,
    DDM:            0x95,    // Distributed Data Management - required for IND$FILE / DFT mode
    AUX_DEVICES:    0x99,
    IMPL_PARTITION: 0xA6,
});

// Models supported (all 3278/3279 family)
export const Models = Object.freeze({
    2: { rows: 24, cols:  80, terminalType: 'IBM-3278-2-E'  },
    3: { rows: 32, cols:  80, terminalType: 'IBM-3278-3-E'  },
    4: { rows: 43, cols:  80, terminalType: 'IBM-3278-4-E'  },
    5: { rows: 27, cols: 132, terminalType: 'IBM-3278-5-E'  },
});
