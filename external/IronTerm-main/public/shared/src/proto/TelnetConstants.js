// Telnet wire-protocol byte values shared by every TelnetCore consumer.
//
// Anything that is specific to a host protocol (TN3270E sub-option 0x28,
// TN5250 NEW-ENVIRON sub-option 0x27, their data-stream headers, etc.)
// lives next to that protocol — not here.

// ---- Telnet IAC and the small fixed set of 1-byte commands -----------
export const Telnet = Object.freeze({
    IAC:  0xFF,                     // Interpret As Command
    DONT: 0xFE,
    DO:   0xFD,
    WONT: 0xFC,
    WILL: 0xFB,
    SB:   0xFA,                     // Begin subnegotiation
    GA:   0xF9,
    EL:   0xF8,
    EC:   0xF7,
    AYT:  0xF6,
    AO:   0xF5,
    IP:   0xF4,
    BRK:  0xF3,
    DM:   0xF2,
    NOP:  0xF1,
    SE:   0xF0,                     // End of subnegotiation
    EOR:  0xEF,                     // End of record (RFC 885 / TN3270 / TN5250)
});

// ---- Telnet options we know about ------------------------------------
// Both TN3270E and TN5250E require BINARY + EOR + TERMINAL-TYPE. The
// protocol-specific options (TN3270E = 0x28, NEW-ENVIRON = 0x27) live
// in their respective extension modules.
export const TelnetOption = Object.freeze({
    BINARY:        0x00,
    TERMINAL_TYPE: 0x18,
    EOR:           0x19,
});

// ---- Terminal-Type subnegotiation ------------------------------------
export const TermType = Object.freeze({
    IS:   0x00,
    SEND: 0x01,
});
