// ENPTUI (Enhanced Non-Programmable Terminal User Interface) constants.
//
// ENPTUI is the IBM 5250 extension that adds GUI primitives — windows,
// radio buttons, checkboxes, push buttons, menu bars and scroll bars —
// to an otherwise character-cell terminal. The host emits these as
// "structured field" segments inside a WTDSF order (0x15) within a
// regular Write-to-Display command.
//
// Wire layout of one ENPTUI segment (inside a WTDSF body):
//
//     <segment-length 2 bytes>  <class 0xD9>  <minor type 1 byte>  <type-specific payload>
//
// Reference: IBM ENPTUI architecture document. The constant values
// in that file map 1:1 to the constants below.

// ---- Major class --------------------------------------------------------
export const ENPTUI_CLASS = 0xD9;

// ---- Minor structured-field types (the byte after the class) ----------
export const Sf = Object.freeze({
    DEFINE_SEL_FLD:        0x50,    //  80 — selection field / menu bar / push buttons
    CREATE_WINDOW:         0x51,    //  81 — bordered window with optional title/footer
    UNREST_WIN_CURSOR:     0x52,    //  82 — allow cursor outside current window
    SCROLL_BAR_FLD:        0x53,    //  83 — scroll bar with thumb position
    WRITE_DATA:            0x54,    //  84 — inject data into a previously-defined construct
    PROG_MOUSE_BUTTON:     0x55,    //  85 — register a mouse-event handler region
    REMOVE_GUI_SEL_FLD:    0x58,    //  88 — destroy a selection field
    REMOVE_GUI_WINDOW:     0x59,    //  89 — destroy a window
    REMOVE_SCROLL_BAR_FLD: 0x5B,    //  91 — destroy a scroll bar
    REMOVE_ALL_GUI:        0x5F,    //  95 — wipe every construct
    DEFINE_GRID:           0x60,    //  96 — table grid lines
    CLEAR_GRID:            0x61,    //  97 — clear grid lines
});

// ---- Selection-field subtypes (byte at offset +4 inside DEFINE_SEL_FLD) -
export const SelType = Object.freeze({
    MENU_BAR:              0x01,    //   1 — top-of-screen menu bar
    SINGLE_SEL_FLD:        0x11,    //  17 — radio-button group inline on screen
    MULTI_SEL_FLD:         0x12,    //  18 — checkbox group inline on screen
    SINGLE_SEL_LIST:       0x21,    //  33 — radio list inside a window
    MULTI_SEL_LIST:        0x22,    //  34 — checkbox list inside a window
    SINGLE_SEL_PULL:       0x31,    //  49 — pull-down radio (from a menu bar)
    MULTI_SEL_PULL:        0x32,    //  50 — pull-down checkbox
    PUSH_BUTTONS:          0x41,    //  65 — push-button bar inline on screen
    PUSH_BUTTON_PULL:      0x51,    //  81 — pull-down push buttons
});

// Convenience predicates.
export function isMenuBar    (t) { return t === SelType.MENU_BAR; }
export function isPushButton (t) { return t === SelType.PUSH_BUTTONS || t === SelType.PUSH_BUTTON_PULL; }
export function isSelection  (t) {
    return t === SelType.SINGLE_SEL_FLD  || t === SelType.MULTI_SEL_FLD
        || t === SelType.SINGLE_SEL_LIST || t === SelType.MULTI_SEL_LIST
        || t === SelType.SINGLE_SEL_PULL || t === SelType.MULTI_SEL_PULL;
}
export function isSingleSelect (t) {
    return t === SelType.SINGLE_SEL_FLD || t === SelType.SINGLE_SEL_LIST || t === SelType.SINGLE_SEL_PULL;
}

// ---- Window border styles (CreateWindow flag2 low nibble) --------------
export const BorderStyle = Object.freeze({
    UPPER_HORIZONTAL: 0,
    LOWER_HORIZONTAL: 1,
    LEFT_VERTICAL:    2,
    RIGHT_VERTICAL:   3,
    PLAIN_BOX:        4,
    H_RULED_BOX:      5,
    V_RULED_BOX:      6,
    HV_RULED_BOX:     7,
});

// ---- Window line styles -----------------------------------------------
export const LineStyle = Object.freeze({
    SOLID:         0,
    BOLD:          1,
    DOUBLE:        2,
    DOTTED:        3,
    DASHED:        8,
    BOLD_DASHED:   9,
    DOUBLE_DASHED: 10,
});

// ---- ENPTUI construct kinds (used by ScreenBuffer.enptui storage) -----
export const ConstructKind = Object.freeze({
    WINDOW:                 'window',
    MENU_BAR:               'menuBar',
    SELECTION_FIELD:        'selectionField',
    PUSH_BUTTONS:           'pushButtons',
    SCROLL_BAR:             'scrollBar',
    MOUSE_REGION:           'mouseRegion',
    GRID:                   'grid',
});

// ---- Selection-field item flags (one byte per item) -------------------
// Inside each "choice text" entry of a DefineSelFld, a flag byte tells
// us whether the item is selected, available, or has indicators.
export const ChoiceFlag = Object.freeze({
    SELECTED:      0x10,
    UNAVAILABLE:   0x20,
    AID_KEY:       0x40,
    NUMBERED:      0x80,
});

// ---- Sense codes we can raise on malformed ENPTUI ---------------------
// Per the ENPTUI architecture document — these get propagated back to the
// host as a negative response so it stops sending broken structured
// fields rather than the client silently rendering garbage.
export const SenseCode = Object.freeze({
    MAJOR_LEN_ERROR:           0x10079010,
    WSF_CLASS_TYPE:            0x10079011,
    WSF_PARM:                  0x10079012,
    INVALID_MINOR_LENGTH:      0x10079013,
    GRID_CONSTR:               0x10079050,
    GRID_OFFSET:               0x10079051,
    GRID_HVOPT:                0x10079052,
    GRID_RESTORE:              0x10079053,
    WRITE_DATA_ERROR:          0x10079100,
    WRITE_DATA_TOO_LONG:       0x10079101,
    WRITE_DATA_CCSID_ERROR:    0x10079105,
});
