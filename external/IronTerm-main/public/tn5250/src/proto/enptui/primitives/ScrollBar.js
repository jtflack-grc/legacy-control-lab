// ENPTUI Scroll Bar Field (minor type 0x53) decoder.
//
// A scroll bar attaches to another construct (typically a selection
// list inside a window) and represents the visible-vs-total ratio of
// items, with arrow caps at top/bottom and a draggable "thumb" / slider.
//
// Wire layout:
//
//   +0  flag1
//   +1  direction   (0 = vertical, 1 = horizontal)
//   +2  rowOffset
//   +3  colOffset
//   +4  length      (track length in cells)
//   +5..+8  totalRows (32-bit, big-endian)
//   +9..+12 visibleRows (32-bit)
//   +13..+16 sliderPos  (32-bit, top of slider)
//   ...etc.
//
// Reference: ENPTUI scroll-bar construct definition.
//
// Phase-2b stub: we capture the geometry so the renderer can paint the
// track + thumb. Drag-to-scroll interactivity is left for Phase 2c.

import { ConstructKind } from '../Constants.js';

export function decodeScrollBar (body, screen) {
    if (body.length < 13) return null;

    const flag1       = body[0];
    const direction   = body[1];
    const rowOffset   = body[2];
    const colOffset   = body[3];
    const length      = body[4];
    const totalRows   = readU32(body, 5);
    const visibleRows = readU32(body, 9);
    const sliderPos   = body.length >= 17 ? readU32(body, 13) : 0;

    return {
        kind: ConstructKind.SCROLL_BAR,
        cursorAtStart: screen.cursor,
        flag1,
        direction,
        rowOffset,
        colOffset,
        length,
        totalRows,
        visibleRows,
        sliderPos,
    };
}

function readU32 (bytes, off) {
    return ((bytes[off]   & 0xFF) << 24)
         | ((bytes[off+1] & 0xFF) << 16)
         | ((bytes[off+2] & 0xFF) <<  8)
         |  (bytes[off+3] & 0xFF);
}
