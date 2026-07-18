// ENPTUI CreateWindow (minor type 0x51) decoder.
//
// A Window draws a rectangular box on the screen with optional title
// and footer text, and indicates the "interior" cells the user should
// see as the active area. Real layout per the ENPTUI architecture
// document:
//
//   payload[0]  flag1
//   payload[1]  flag2 / mono
//   payload[2]  reserved
//   payload[3]  height (rows)
//   payload[4]  width  (cols)
//   payload[5+] minor structures: <minorLen 1B> <minorType 1B> <body>
//     minorType 0x01 = Border Presentation (flag + 8 border glyphs)
//     minorType 0x10 = Title/Footer (flag selects which, + attr + text)
//
// The CreateWindow header carries only the rectangle; title, footer
// and border characters arrive as minor structures so the host can
// send each independently. Window position comes from the cursor at
// the time of the CreateWindow segment (i.e. the most recent SBA).

import { ConstructKind, BorderStyle, LineStyle } from '../Constants.js';

const MINOR_BORDER       = 0x01;
const MINOR_TITLE_FOOTER = 0x10;

// Default border glyph palette (CP037 EBCDIC codes):
//   topLeft, top, topRight, leftSide, rightSide, botLeft, bot, botRight
const DEFAULT_BORDERS = [0xC4, 0xC4, 0xBF, 0xB3, 0xB3, 0xC0, 0xC4, 0xD9];

// Non-display attribute bytes.
// When the border's "presentation attribute" matches any of these the
// window has NO visible border - the host wants only the interior to
// show, no rectangle drawn around it.
const NON_DISPLAY_ATTRS = new Set([0x27, 0x2F, 0x37, 0x3F]);

export function decodeWindow (body, screen) {
    if (body.length < 5) return null;

    const flag1   = body[0];
    const flag2   = body[1];
    // body[2] reserved
    const height  = body[3];
    const width   = body[4];

    // Window top-left comes from the cursor's row/col at decode time
    // (the host emits an SBA immediately before the CreateWindow).
    const sfRow = (screen.cursor / screen.cols | 0);
    const sfCol = (screen.cursor % screen.cols);

    // Per the ENPTUI window construct:
    //   flag1 bit 0x80 = cursor unrestricted (else: stay in window)
    //   flag1 bit 0x40 = menu-pull-down (skip top border row to glue
    //                    visually to the parent menu bar)
    //   flag2 low nibble = BorderStyle (0..7)
    const cursorRestricted = (flag1 & 0x80) === 0;
    const menuPullDown     = (flag1 & 0x40) !== 0;
    const borderStyle      = flag2 & 0x0F;

    // Walk minor structures for border / title / footer.
    const result = {
        kind: ConstructKind.WINDOW,
        cursorAtStart: screen.cursor,
        topRow:  sfRow + 1,                  // store 1-based to match SBA convention
        leftCol: sfCol + 1,
        height,
        width,
        borderStyle,
        lineStyle:   LineStyle.SOLID,
        flag1,
        flag2,
        cursorRestricted,
        menuPullDown,
        borderAttr:  0x20,                   // default: green-normal; updated by Border minor
        noBorder:    false,
        borders:     DEFAULT_BORDERS.slice(),
        title:       null,                   // {text, attr, align} | null
        footer:      null,
    };

    let pos = 5;
    while (pos + 2 <= body.length) {
        const minorLen  = body[pos];
        const minorType = body[pos + 1];
        if (minorLen < 2 || pos + minorLen > body.length) break;
        const entry = body.subarray(pos, pos + minorLen);
        if      (minorType === MINOR_BORDER)        applyBorder(entry, result);
        else if (minorType === MINOR_TITLE_FOOTER)  applyTitleFooter(entry, result, screen);
        pos += minorLen;
    }
    return result;
}

/** Border Presentation minor (0x01). Layout:
 *    entry[0] minorLen
 *    entry[1] minorType (0x01)
 *    entry[2] flag (high bit 0x80 ⇒ entry carries 8 glyph overrides)
 *    entry[3..10] 8 glyph EBCDIC bytes when the flag's high bit is set */
function applyBorder (entry, result) {
    if (entry.length < 3) return;
    const flag = entry[2];
    // The first byte after the flag is the border presentation
    // attribute (5250 attribute byte). Inspect this byte against
    // the non-display attribute set; when matched we hide the border
    // entirely. Then the next 8 bytes (when flag's high bit is set)
    // are the border glyph palette override.
    if (entry.length >= 4) {
        result.borderAttr = entry[3];
        if (NON_DISPLAY_ATTRS.has(entry[3])) result.noBorder = true;
    }
    if (entry.length >= 5) result.lineStyle = entry[4];
    if ((flag & 0x80) === 0) return;
    if (entry.length < 13) return;
    for (let i = 0; i < 8; i++) result.borders[i] = entry[5 + i];
}

/** Title/Footer minor (0x10). Layout per the ENPTUI reference:
 *    entry[0] minorLen
 *    entry[1] minorType (0x10)
 *    entry[2] flag (0x20 = footer, else title; 0x40/0x80 = alignment)
 *    entry[3] reserved
 *    entry[4] text attribute (5250 attribute byte)
 *    entry[5] reserved
 *    entry[6..N] EBCDIC text bytes */
function applyTitleFooter (entry, result, screen) {
    if (entry.length < 7) return;
    const flag       = entry[2];
    // entry[3] reserved
    const textAttr   = entry[4];
    // entry[5] reserved
    const isFooter   = (flag & 0x20) !== 0;
    const align      = (flag & 0x40) ? 'right'
                    : (flag & 0x80) ? 'center'
                    : 'left';
    const textBytes  = entry.subarray(6);
    let text = '';
    for (const b of textBytes) {
        if (b === 0x00) break;             // null terminator
        text += screen.ebcdic.toChar(b);
    }
    const info = { text, textBytes, attr: textAttr, align };
    if (isFooter) result.footer = info;
    else          result.title  = info;
}

// Re-exports so the dispatcher can build the right kind without
// reaching into Constants.
export { BorderStyle, LineStyle };
