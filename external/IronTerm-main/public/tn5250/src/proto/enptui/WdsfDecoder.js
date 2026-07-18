// Write-to-Display Structured Field decoder for ENPTUI segments.
//
// Called from InboundParser when it sees a WTDSF order (0x15) inside a
// regular WTD command. A single WTDSF body can contain ONE OR MORE
// concatenated ENPTUI segments, each with its own length header.
//
// Segment layout:
//
//     +0  +1  segment length (big-endian, includes itself)
//     +2  class (0xD9 = ENPTUI; anything else = unknown, skip)
//     +3  minor type (see ./Constants.js Sf.*)
//     +4..n  type-specific payload
//
// This module decodes the wrapper and dispatches to the appropriate
// primitive parser. Each primitive returns a small JS object that gets
// stored on `screen.enptui` for later use by the renderer / input layer.
//
// The dispatcher must be tolerant: a host can send a segment we don't
// fully implement, and we should keep walking through the rest of the
// WTDSF body rather than bail on the whole record.

import { ENPTUI_CLASS, Sf, ConstructKind } from './Constants.js';
import { decodeSelectionField, buildAttachedScrollBar } from './primitives/SelectionField.js';
import { decodeWindow }         from './primitives/Window.js';
import { decodeScrollBar }      from './primitives/ScrollBar.js';
import { debugFor }             from '../../../../shared/src/core/debug.js';

const debug = debugFor('tn5250.enptui');

// Grid construct-type values per the ENPTUI architecture document:
const GRID_UPPER_H   = 0;
const GRID_LOWER_H   = 1;
const GRID_LEFT_V    = 2;
const GRID_RIGHT_V   = 3;
const GRID_PLAIN_BOX = 4;
const GRID_H_RULED   = 5;
const GRID_V_RULED   = 6;
const GRID_HV_RULED  = 7;

// Per-cell bit flags in the grid buffer.
const G_LOWER_H = 0x01;
const G_RIGHT_V = 0x02;
const G_UPPER_H = 0x04;
const G_LEFT_V  = 0x08;

/** Apply a single grid minor record to the buffer. Walks the affected
 *  rectangle (rec.width × rec.height cells starting at rec.startRow/
 *  startCol) and ORs in the appropriate bit flags. `repeat1` / `repeat2`
 *  duplicate the pattern vertically / horizontally to draw multi-row
 *  or multi-column grids in one record. */
function applyGridMinor (grid, screen, rec) {
    const set = (rec.hvOptions & 0x80) !== 0;
    const op = (idx, mask) => {
        if (idx < 0 || idx >= grid.length) return;
        grid[idx] = set ? (grid[idx] | mask) : (grid[idx] & ~mask);
    };
    const rep1 = Math.max(1, rec.repeat1 || 1);
    const rep2 = Math.max(1, rec.repeat2 || 1);
    for (let rRep = 0; rRep < rep1; rRep++) {
        for (let cRep = 0; cRep < rep2; cRep++) {
            const r0 = rec.startRow - 1 + rRep * rec.height;
            const c0 = rec.startCol - 1 + cRep * rec.width;
            for (let r = 0; r < rec.height; r++) {
                for (let c = 0; c < rec.width; c++) {
                    const idx = (r0 + r) * screen.cols + (c0 + c);
                    switch (rec.constructType) {
                        case GRID_UPPER_H:
                            if (r === 0) op(idx, G_UPPER_H);
                            break;
                        case GRID_LOWER_H:
                            if (r === rec.height - 1) op(idx, G_LOWER_H);
                            break;
                        case GRID_LEFT_V:
                            if (c === 0) op(idx, G_LEFT_V);
                            break;
                        case GRID_RIGHT_V:
                            if (c === rec.width - 1) op(idx, G_RIGHT_V);
                            break;
                        case GRID_PLAIN_BOX:
                            if (r === 0)               op(idx, G_UPPER_H);
                            if (r === rec.height - 1)  op(idx, G_LOWER_H);
                            if (c === 0)               op(idx, G_LEFT_V);
                            if (c === rec.width - 1)   op(idx, G_RIGHT_V);
                            break;
                        case GRID_H_RULED:
                            op(idx, G_UPPER_H | G_LOWER_H);
                            break;
                        case GRID_V_RULED:
                            op(idx, G_LEFT_V | G_RIGHT_V);
                            break;
                        case GRID_HV_RULED:
                            op(idx, G_UPPER_H | G_LOWER_H | G_LEFT_V | G_RIGHT_V);
                            break;
                    }
                }
            }
        }
    }
}

/**
 * @param {Uint8Array} bytes        full WTDSF body (segments back-to-back)
 * @param {object}     screen       ScreenBuffer instance, used both for
 *                                  read (cursor position when a segment
 *                                  is "at current SBA") and write (push
 *                                  decoded constructs onto screen.enptui).
 */
export function decodeWdsf (bytes, screen) {
    let pos = 0;
    while (pos < bytes.length) {
        if (pos + 4 > bytes.length) break;
        const len   = (bytes[pos] << 8) | bytes[pos + 1];
        const cls   =  bytes[pos + 2];
        const minor =  bytes[pos + 3];
        if (len < 4) {
            debug.warn(`segment too short (len=${len}) at offset ${pos}`);
            break;
        }
        const end     = Math.min(pos + len, bytes.length);
        const payload = bytes.subarray(pos + 4, end);

        if (cls !== ENPTUI_CLASS) {
            // Unknown major class - skip this segment but keep parsing.
            debug.warn(`unknown class 0x${cls.toString(16)} (minor=0x${minor.toString(16)}), skipping`);
            pos = end;
            continue;
        }

        dispatch(minor, payload, screen);
        pos = end;
    }
}

function dispatch (minor, payload, screen) {
    switch (minor) {
        case Sf.DEFINE_SEL_FLD: {
            const sf = decodeSelectionField(payload, screen);
            if (sf) {
                screen.enptui.add(sf);
                // When the SF carries an attached scroll bar, create it
                // as a separate construct linked to its parent so
                // REMOVE_GUI_SEL_FLD cascades correctly and the user
                // can drag/click the scroll thumb independently.
                const attached = buildAttachedScrollBar(sf);
                if (attached) screen.enptui.add(attached);
            }
            return;
        }
        case Sf.CREATE_WINDOW: {
            const w = decodeWindow(payload, screen);
            if (w) screen.enptui.add(w);
            return;
        }
        case Sf.SCROLL_BAR_FLD: {
            const sb = decodeScrollBar(payload, screen);
            if (sb) screen.enptui.add(sb);
            return;
        }
        case Sf.UNREST_WIN_CURSOR: {
            // Lets the cursor leave the current window's interior. The
            // host emits this once after CreateWindow when it wants to
            // relax the restriction (e.g. a pull-down menu over a list).
            // We flip the `cursorRestricted` flag on the matching window
            // so InputController's arrow-key clamp lets through.
            const win = screen.enptui.constructs.find(
                c => c.kind === 'window' && c.cursorAtStart === screen.cursor);
            if (win) win.cursorRestricted = false;
            return;
        }
        case Sf.WRITE_DATA: {
            // Three modes per the ENPTUI architecture document:
            //   flag1 bit 0x40 = CCSID-based Unicode write into the
            //     5250 field that owns the current SBA. Payload: flag1,
            //     flag2, ccsidHi, ccsidLo, then up to (field.length * 2)
            //     bytes (UTF-16BE or similar).
            //   flag1 bit 0x80 = standard data block write into the
            //     5250 field. Payload: flag1, flag2, reserved, bytes.
            //   neither bit set = WRITE_DATA on a construct (scroll
            //     bar slider refresh, selection-field state update).
            if (payload.length < 1) return;
            const flag1 = payload[0];

            if ((flag1 & 0xC0) !== 0) {
                // Field-targeted write: locate the SF at the current
                // SBA and overwrite its data cells.
                const field = screen.fields.find(f => f.start === screen.cursor);
                if (!field) {
                    // Real hardware would raise SC_WSFWriteDataError here.
                    debug.warn('WRITE_DATA at cursor with no field present');
                    return;
                }
                if (flag1 & 0x40) {
                    // CCSID-based (Unicode) write. We don't truly support
                    // Unicode planes on the screen buffer yet - decode
                    // pairs of bytes as a UTF-16BE codepoint and stash
                    // the EBCDIC nearest-match.
                    // payload: [0]=flag1 [1]=flag2 [2..3]=ccsid [4..]=data
                    const data = payload.subarray(4);
                    for (let i = 0, k = 0; i + 1 < data.length && k < field.length; i += 2, k++) {
                        const cp = (data[i] << 8) | data[i + 1];
                        const idx = (field.start + 1 + k) % screen.size;
                        const cell = screen.cells[idx];
                        cell.byte = screen.ebcdic.fromCharCode(cp);
                        cell.glyph = String.fromCharCode(cp);
                    }
                } else {
                    // Standard EBCDIC write. Payload: flag1, flag2,
                    // reserved, then data bytes.
                    const data = payload.subarray(3);
                    for (let k = 0; k < data.length && k < field.length; k++) {
                        const idx = (field.start + 1 + k) % screen.size;
                        const cell = screen.cells[idx];
                        cell.byte = data[k];
                        cell.glyph = screen.ebcdic.toChar(data[k]);
                    }
                }
                field.modified = true;
                return;
            }

            // Construct-targeted write (no high bits set).
            const construct = screen.enptui.constructs.find(
                c => c.cursorAtStart === screen.cursor);
            if (construct) {
                construct.writeData = payload.slice();
                if (construct.kind === 'scrollBar' && payload.length >= 8) {
                    construct.totalRows = (payload[0] << 24) | (payload[1] << 16) | (payload[2] << 8) | payload[3];
                    construct.sliderPos = (payload[4] << 24) | (payload[5] << 16) | (payload[6] << 8) | payload[7];
                }
            }
            return;
        }
        case Sf.PROG_MOUSE_BUTTON: {
            // Registers a mouse-region handler. Layout: <flag1> <flag2>
            // <row> <col> <rows> <cols> <aidCode>. We store the region
            // so the input controller can fire the aid when the user
            // clicks inside it (mostly used by graphical apps; pub400
            // doesn't emit these).
            if (payload.length >= 7) {
                screen.enptui.add({
                    kind: 'mouseRegion',
                    cursorAtStart: screen.cursor,
                    flag1: payload[0],
                    flag2: payload[1],
                    row:   payload[2] + 1,
                    col:   payload[3] + 1,
                    rows:  payload[4],
                    cols:  payload[5],
                    aidCode: payload[6],
                });
            }
            return;
        }
        case Sf.REMOVE_GUI_SEL_FLD: {
            // Remove the selection field / menu bar / push buttons at
            // the cursor, AND any attached scroll bar that referenced
            // it as parent. The ENPTUI clear-construct path does
            // the same cascade so the user doesn't see a phantom
            // scrollbar after its list disappears.
            const removedSel = [
                ...screen.enptui.removeAt(screen.cursor, ConstructKind.SELECTION_FIELD),
                ...screen.enptui.removeAt(screen.cursor, ConstructKind.MENU_BAR),
                ...screen.enptui.removeAt(screen.cursor, ConstructKind.PUSH_BUTTONS),
            ];
            for (const parent of removedSel) screen.enptui.removeChildrenLinkedTo(parent);
            return;
        }
        case Sf.REMOVE_GUI_WINDOW: {
            // Cascade: every selection field, scroll bar, grid, mouse
            // region that lay entirely inside the window goes away too.
            const removedWindows = screen.enptui.removeAt(screen.cursor, ConstructKind.WINDOW);
            for (const w of removedWindows) screen.enptui.removeChildrenOf(w);
            return;
        }
        case Sf.REMOVE_SCROLL_BAR_FLD:
            screen.enptui.removeAt(screen.cursor, ConstructKind.SCROLL_BAR);
            return;
        case Sf.REMOVE_ALL_GUI:
            screen.enptui.clear();
            return;
        case Sf.DEFINE_GRID: {
            // Per the ENPTUI grid definition.
            // Major header (after class+minor):
            //   [0] class-check (must be 0x01)
            //   [1] preFlags1 (0x80 = clear all grid first)
            //   [2] reserved
            //   [3] preFlags2 (0x80 = clear grid after applying minors)
            //   [4..6] reserved
            // Followed by zero or more minor records of length 7..11:
            //   [0] minorLen
            //   [1] constructType (0..7 - UPPER_H/LOWER_H/LEFT_V/RIGHT_V/
            //                       PLAIN_BOX/H_RULED/V_RULED/HV_RULED)
            //   [2] hvOptions (0x80 = set, else clear)
            //   [3] startRow (1-based)
            //   [4] startCol (1-based)
            //   [5] width   (columns spanned for H types)
            //   [6] height  (rows    spanned for V types)
            //   [7..8] reserved
            //   [9] repeat1 (if minorLen >= 10: row-repeat for H/HV)
            //   [10] repeat2 (if minorLen >= 11: col-repeat for V/HV)
            if (payload.length < 7) return;
            const preFlags1 = payload[1];
            const preFlags2 = payload[3];

            // Grid is stored as a per-cell bit map. Bits per cell:
            //   0x01 = lower horizontal rule on this cell's bottom edge
            //   0x02 = right  vertical   rule on this cell's right edge
            //   0x04 = upper horizontal rule on this cell's top    edge
            //   0x08 = left   vertical   rule on this cell's left  edge
            let grid = (preFlags1 & 0x80)
                ? new Uint8Array(screen.size)              // fresh start
                : (screen.enptui.constructs.find(c => c.kind === 'grid')?.gridBuf ?? new Uint8Array(screen.size));

            let pos = 7;
            const records = [];
            while (pos + 7 <= payload.length) {
                const minorLen = payload[pos];
                if (minorLen < 7 || pos + minorLen > payload.length) break;
                const rec = {
                    constructType: payload[pos + 1],
                    hvOptions:     payload[pos + 2],
                    startRow:      payload[pos + 3],
                    startCol:      payload[pos + 4],
                    width:         payload[pos + 5],
                    height:        payload[pos + 6],
                    repeat1:       minorLen >= 10 ? payload[pos + 9]  : 1,
                    repeat2:       minorLen >= 11 ? payload[pos + 10] : 1,
                };
                applyGridMinor(grid, screen, rec);
                records.push(rec);
                pos += minorLen;
            }
            if (preFlags2 & 0x80) grid = new Uint8Array(screen.size);

            // Replace any existing grid construct at this SBA.
            screen.enptui.removeAt(screen.cursor, 'grid');
            screen.enptui.add({
                kind:          'grid',
                cursorAtStart: screen.cursor,
                gridBuf:       grid,
                records,
            });
            return;
        }
        case Sf.CLEAR_GRID: {
            // The CLEAR_GRID minor clears a rectangle of cells (zeroes the
            // grid buffer at those positions) - it does NOT remove the
            // whole construct. Payload: [0] flag, [1..2] reserved,
            // [3] startRow, [4] startCol, [5] width, [6] height.
            const grids = screen.enptui.constructs.filter(c => c.kind === 'grid');
            if (grids.length === 0) return;
            if (payload.length >= 7) {
                const r0 = payload[3] - 1, c0 = payload[4] - 1;
                const w  = payload[5],     h  = payload[6];
                for (const g of grids) {
                    if (!g.gridBuf) continue;
                    for (let r = 0; r < h; r++) {
                        for (let c = 0; c < w; c++) {
                            const idx = (r0 + r) * screen.cols + (c0 + c);
                            if (idx >= 0 && idx < g.gridBuf.length) g.gridBuf[idx] = 0;
                        }
                    }
                }
            } else {
                screen.enptui.removeAt(screen.cursor, 'grid');
            }
            return;
        }
        default:
            debug.warn(`unknown minor type 0x${minor.toString(16)} (len=${payload.length})`);
    }
}
