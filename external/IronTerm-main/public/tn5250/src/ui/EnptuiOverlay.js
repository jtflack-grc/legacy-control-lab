// ENPTUI overlay: paints windows, selection-field indicators, push
// buttons, menu bars, scroll bars and grid separators on top of the
// 5250 cell grid. Driven entirely from screen.enptui (populated by
// the WdsfDecoder during inbound parsing).
//
// Geometry is provided by the renderer:
//   { cellWidth, cellHeight, fontSize, cursorBlink }
//
// All colour lookups go through ./theme.js.

import { ConstructKind, isSingleSelect } from '../proto/enptui/Constants.js';
import { AttrIndex } from '../proto/enptui/primitives/SelectionField.js';
import { ATTR_BASE } from '../proto/Constants.js';
import { COLOR } from './theme.js';

export class EnptuiOverlay {
    /** @param {import('../display/ScreenBuffer.js').ScreenBuffer} screen */
    constructor (screen) {
        this.screen = screen;
        this.g = null;
    }

    /** Paint all active ENPTUI constructs on the canvas. */
    paint (ctx, geometry) {
        const store = this.screen.enptui;
        if (!store || store.all.length === 0) return;

        this.g = geometry;
        for (const c of store.all) {
            switch (c.kind) {
                case ConstructKind.WINDOW:           this.#drawWindow(ctx, c); break;
                case ConstructKind.SELECTION_FIELD:  this.#drawSelectionField(ctx, c); break;
                case ConstructKind.MENU_BAR:         this.#drawMenuBar(ctx, c); break;
                case ConstructKind.PUSH_BUTTONS:     this.#drawPushButtons(ctx, c); break;
                case ConstructKind.SCROLL_BAR:       this.#drawScrollBar(ctx, c); break;
                case ConstructKind.GRID:             this.#drawGrid(ctx, c); break;
                // Mouse regions are invisible by design - the input
                // controller fires AIDs when the user clicks inside them.
            }
        }
        void isSingleSelect;        // imported for future use
    }

    /** Draw the grid separator lines from a host-defined construct.
     *  Grid edges are stored as a per-cell bit map (G_LOWER_H /
     *  G_RIGHT_V / G_UPPER_H / G_LEFT_V); we stroke each edge on its
     *  cell boundary. The bit map is constructed by WdsfDecoder's
     *  applyGridMinor() when DEFINE_GRID is processed. */
    #drawGrid (ctx, g) {
        if (!g.gridBuf) return;
        const { cellWidth: cw, cellHeight: ch } = this.g;
        const cols = this.screen.cols;
        ctx.save();
        ctx.strokeStyle = COLOR.turquoise;
        ctx.lineWidth = 1;
        for (let idx = 0; idx < g.gridBuf.length; idx++) {
            const flags = g.gridBuf[idx];
            if (flags === 0) continue;
            const row = (idx / cols) | 0;
            const col = idx % cols;
            const x = col * cw;
            const y = row * ch;
            ctx.beginPath();
            if (flags & 0x04) { ctx.moveTo(x, y + 0.5);                 ctx.lineTo(x + cw, y + 0.5); }
            if (flags & 0x01) { ctx.moveTo(x, y + ch - 0.5);            ctx.lineTo(x + cw, y + ch - 0.5); }
            if (flags & 0x08) { ctx.moveTo(x + 0.5, y);                 ctx.lineTo(x + 0.5, y + ch); }
            if (flags & 0x02) { ctx.moveTo(x + cw - 0.5, y);            ctx.lineTo(x + cw - 0.5, y + ch); }
            ctx.stroke();
        }
        ctx.restore();
    }

    #drawWindow (ctx, w) {
        const { cellWidth, cellHeight, fontSize } = this.g;
        const x = (w.leftCol - 1) * cellWidth;
        const y = (w.topRow  - 1) * cellHeight;
        const wpx = w.width  * cellWidth;
        const hpx = w.height * cellHeight;

        ctx.save();
        // Non-display border (host requested zero-visible-frame
        // attribute 0x27/0x2F/0x37/0x3F): skip the frame entirely.
        // Title/footer still renders below.
        if (!w.noBorder) {
            const borderDesc = ATTR_BASE[w.borderAttr];
            const frameColor = borderDesc ? (COLOR[borderDesc.fg] ?? COLOR.turquoise)
                                           : COLOR.turquoise;
            ctx.strokeStyle = frameColor;
            // Line style decoded from the Border minor's byte 5:
            //   0=solid, 1=bold, 2=double, 3=dotted, 8=dashed,
            //   9=bold dashed, 10=double dashed
            switch (w.lineStyle) {
                case 1:  ctx.lineWidth = 2; break;
                case 3:  ctx.setLineDash([2, 2]); break;
                case 8:  ctx.setLineDash([5, 3]); break;
                case 9:  ctx.lineWidth = 2; ctx.setLineDash([5, 3]); break;
                case 10: ctx.setLineDash([5, 3]); break;
            }
            // Menu-pull-down windows omit the top border so the visual
            // glues to the originating menu-bar row.
            if (w.menuPullDown) {
                ctx.beginPath();
                ctx.moveTo(x + 0.5, y);
                ctx.lineTo(x + 0.5, y + hpx);
                ctx.lineTo(x + wpx - 0.5, y + hpx);
                ctx.lineTo(x + wpx - 0.5, y);
                ctx.stroke();
            } else {
                ctx.strokeRect(x + 0.5, y + 0.5, wpx - 1, hpx - 1);
                if (w.lineStyle === 2 || w.lineStyle === 10) {
                    ctx.strokeRect(x + 2.5, y + 2.5, wpx - 5, hpx - 5);
                }
            }
            ctx.setLineDash([]);
        }

        // Title and footer come as { text, attr, align } objects from
        // the Window decoder. Attr is a 5250 attribute byte; resolve it
        // through ATTR_BASE so colour and reverse/underline modifiers
        // match what the host requested.
        const drawText = (info, yPos) => {
            if (!info || !info.text) return;
            const desc = ATTR_BASE[info.attr];
            const fg = desc?.reverse ? (COLOR[desc.bg] ?? COLOR.black)
                                     : (COLOR[desc?.fg] ?? COLOR.white);
            const bg = desc?.reverse ? (COLOR[desc.fg] ?? COLOR.white)
                                     : (COLOR[desc?.bg] ?? COLOR.black);
            ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
            ctx.textBaseline = 'middle';
            const txt = ' ' + info.text.trimEnd() + ' ';
            const txtW = txt.length * cellWidth;
            let txtX;
            if (info.align === 'center')      txtX = x + (wpx - txtW) / 2;
            else if (info.align === 'right')  txtX = x + wpx - txtW - cellWidth;
            else                              txtX = x + cellWidth;
            ctx.fillStyle = bg;
            ctx.fillRect(txtX, yPos, txtW, cellHeight);
            ctx.fillStyle = fg;
            ctx.textAlign = 'left';
            for (let i = 0; i < txt.length; i++) {
                ctx.fillText(txt[i],
                    txtX + i * cellWidth + cellWidth * 0.02,
                    yPos + cellHeight / 2);
            }
            if (desc?.underline) {
                ctx.fillStyle = fg;
                ctx.fillRect(txtX, yPos + cellHeight - 1, txtW, 1);
            }
        };
        drawText(w.title,  y);
        drawText(w.footer, y + hpx - cellHeight);
        ctx.restore();
    }

    /** Overlay fancy radio / checkbox markers on top of the single-cell
     *  ASCII indicator SelectionField.js painted. Each item knows its
     *  absolute (row, col) on screen; the indicator sits at the very
     *  first cell of the item slot (no parens/brackets around it).
     *  We blank that cell and paint a Unicode glyph (●/○/☑/☐) on top. */
    #drawSelectionField (ctx, sel) {
        const s = this.screen;
        if (!sel.drawIndicator || !sel.itemPositions?.length) return;
        const { cellWidth, cellHeight, fontSize } = this.g;

        // Identify the item the cursor is currently on (if any) so we
        // can paint a reverse-video focus highlight over its label —
        // shows which radio / checkbox the keyboard is about to toggle.
        const focused = s.enptuiItemAtCursor?.();
        const focusedIdx = (focused && focused.construct === sel) ? focused.index : -1;

        ctx.save();
        ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        for (let i = 0; i < sel.items.length; i++) {
            const item = sel.items[i];
            const pos  = sel.itemPositions[i];
            if (!pos) continue;

            const r0 = pos.row - 1;
            const c0 = pos.col - 1;
            const cellX = c0 * cellWidth;
            const cellY = r0 * cellHeight;
            const isFocused = (i === focusedIdx);

            // Resolve the per-state attribute byte the host sent in
            // ChoiceAttributes. Picks the cursor-* slot when the item
            // is focused; otherwise the non-cursor slot. Colours come
            // from the standard ATTR_BASE table.
            const attrByte = item.unavailable
                ? sel.choiceAttrs[isFocused ? AttrIndex.CUR_UNAVAILABLE : AttrIndex.UNAVAILABLE]
                : item.selected
                    ? sel.choiceAttrs[isFocused ? AttrIndex.CUR_SELECTED  : AttrIndex.SELECTED]
                    : sel.choiceAttrs[isFocused ? AttrIndex.CUR_AVAILABLE : AttrIndex.AVAILABLE];
            const indAttrByte = item.unavailable
                ? sel.choiceAttrs[AttrIndex.IND_UNAVAILABLE]
                : sel.choiceAttrs[AttrIndex.IND_AVAILABLE];
            const indDesc = ATTR_BASE[indAttrByte] ?? sel.items[0]?.indDesc;
            const itemDesc = ATTR_BASE[attrByte];

            // Clear the indicator cell so the underlying EBCDIC '.'
            // or '/' doesn't show through underneath our glyph.
            ctx.fillStyle = '#000';
            ctx.fillRect(cellX, cellY, cellWidth, cellHeight);

            const marker = sel.single
                ? (item.selected ? '●' : '○')
                : (item.selected ? '☑' : '☐');

            ctx.fillStyle = indDesc ? (COLOR[indDesc.fg] ?? COLOR.green) : COLOR.green;
            ctx.fillText(marker, cellX + cellWidth / 2, cellY + cellHeight / 2);

            // Repaint the label cells with the resolved per-state
            // attribute. We re-render the EBCDIC bytes (already in the
            // screen buffer) using the chosen fg/bg, then drop the
            // mnemonic underline on top.
            if (itemDesc) {
                const textCol = c0 + 2;
                const textX = textCol * cellWidth;
                const textW = (sel.textSize ?? 0) * cellWidth;
                const fg = itemDesc.reverse ? (COLOR[itemDesc.bg] ?? COLOR.black)
                                            : (COLOR[itemDesc.fg] ?? COLOR.green);
                const bg = itemDesc.reverse ? (COLOR[itemDesc.fg] ?? COLOR.green)
                                            : (COLOR[itemDesc.bg] ?? COLOR.black);
                ctx.fillStyle = bg;
                ctx.fillRect(textX, cellY, textW, cellHeight);
                ctx.fillStyle = fg;
                ctx.textAlign = 'left';
                for (let k = 0; k < (sel.textSize ?? 0); k++) {
                    const cIdx = (pos.row - 1) * s.cols + textCol + k;
                    const cell = s.cells[cIdx];
                    if (!cell) break;
                    ctx.fillText(cell.glyph || ' ',
                        textX + k * cellWidth + cellWidth * 0.02,
                        cellY + cellHeight / 2);
                }
                // Mnemonic underline: highlight the host-designated
                // shortcut character so the user knows which keystroke
                // jumps directly to this item.
                if (item.mnemonicOffset >= 0 && item.mnemonicOffset < (sel.textSize ?? 0)) {
                    ctx.fillStyle = fg;
                    ctx.fillRect(
                        textX + item.mnemonicOffset * cellWidth,
                        cellY + cellHeight - 2,
                        cellWidth, 1);
                }
                if (itemDesc.underline) {
                    ctx.fillStyle = fg;
                    ctx.fillRect(textX, cellY + cellHeight - 1, textW, 1);
                }
                ctx.textAlign = 'center';
            }
        }
        ctx.restore();
    }

    #drawMenuBar (ctx, mb) {
        const s = this.screen;
        if (!mb.items?.length) return;
        const { cellWidth, cellHeight } = this.g;
        const x = (mb.col - 1) * cellWidth;
        const y = (mb.row - 1) * cellHeight;
        const wpx = s.cols * cellWidth - x;

        ctx.save();
        // Reverse-video bar background.
        ctx.fillStyle = 'rgba(80, 145, 255, 0.18)';
        ctx.fillRect(x, y, wpx, cellHeight);

        // Underline beneath the bar.
        ctx.strokeStyle = COLOR.turquoise;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + cellHeight - 1);
        ctx.lineTo(x + wpx, y + cellHeight - 1);
        ctx.stroke();
        ctx.restore();
    }

    #drawPushButtons (ctx, pb) {
        const s = this.screen;
        if (!pb.itemPositions?.length) return;
        const { cellWidth, cellHeight, fontSize } = this.g;
        const focused = s.enptuiItemAtCursor?.();
        const focusedIdx = (focused && focused.construct === pb) ? focused.index : -1;
        ctx.save();
        ctx.lineWidth = 1;

        // Each button occupies `textSize` cells starting at its
        // itemPosition. We render the frame with stroked lines so the
        // visual matches without forcing a specific glyph set:
        //   - left cap, horizontal rule on top + bottom, right cap.
        // Conventions:
        //   - `isNoPushButtonBox` (flag2 0x04) suppresses the frame.
        //   - Cursor on a button (focused) inverts colours.
        //   - Default button (choiceState 0x40) gets a thicker frame.
        //   - Unavailable button uses the unavailable palette colour.
        for (let i = 0; i < pb.items.length; i++) {
            const item = pb.items[i];
            const pos  = pb.itemPositions[i];
            if (!pos) continue;
            if ((item.flag2 & 0x04) !== 0) continue;     // NoPushBox flag

            const isFocused = (i === focusedIdx);
            const isDefault = item.selected;             // "default" button == pre-selected
            const r = pos.row - 1;
            const c = pos.col - 1;
            const x = c * cellWidth;
            const y = r * cellHeight;
            const wpx = pb.textSize * cellWidth;
            const hpx = cellHeight;

            // Pick frame colour from the host-supplied palette.
            const attrByte = item.unavailable
                ? pb.choiceAttrs[AttrIndex.UNAVAILABLE]
                : isFocused
                    ? pb.choiceAttrs[AttrIndex.CUR_AVAILABLE]
                    : pb.choiceAttrs[AttrIndex.AVAILABLE];
            const desc = ATTR_BASE[attrByte];
            const frameColor = desc ? (COLOR[desc.fg] ?? COLOR.turquoise) : COLOR.turquoise;
            ctx.strokeStyle = frameColor;
            ctx.lineWidth = isDefault ? 2 : 1;

            if (isFocused) {
                // Invert: fill the whole button rectangle with the
                // frame colour and re-draw label text in black.
                ctx.fillStyle = frameColor;
                ctx.fillRect(x, y, wpx, hpx);
                ctx.fillStyle = '#000';
                ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';
                for (let k = 0; k < pb.textSize; k++) {
                    const cIdx = r * s.cols + c + k;
                    const cell = s.cells[cIdx];
                    if (!cell) break;
                    ctx.fillText(cell.glyph || ' ',
                        x + k * cellWidth + cellWidth * 0.02,
                        y + hpx / 2);
                }
            }

            // Draw caps + rule. The 3D look comes from horizontal lines
            // 1 px from top/bottom plus side caps.
            ctx.beginPath();
            ctx.moveTo(x, y + 0.5);                ctx.lineTo(x + wpx, y + 0.5);
            ctx.moveTo(x, y + hpx - 0.5);          ctx.lineTo(x + wpx, y + hpx - 0.5);
            ctx.moveTo(x + 0.5, y);                ctx.lineTo(x + 0.5, y + hpx);
            ctx.moveTo(x + wpx - 0.5, y);          ctx.lineTo(x + wpx - 0.5, y + hpx);
            ctx.stroke();
            ctx.lineWidth = 1;
        }
        ctx.restore();
    }

    #drawScrollBar (ctx, sb) {
        const { cellWidth: cw, cellHeight: ch } = this.g;
        const x = sb.colOffset * cw;
        const y = sb.rowOffset * ch;

        ctx.save();
        ctx.strokeStyle = COLOR.turquoise;
        ctx.fillStyle   = 'rgba(92, 246, 255, 0.18)';
        if (sb.direction === 0) {
            // Vertical
            const length = sb.length * ch;
            ctx.fillRect(x, y, cw, length);
            ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, length - 1);
            // Thumb proportional to visible/total.
            const total = Math.max(sb.totalRows, 1);
            const visible = Math.max(sb.visibleRows, 1);
            const thumbH = Math.max(ch, (visible / total) * length);
            const thumbY = y + (sb.sliderPos / total) * length;
            ctx.fillStyle = COLOR.turquoise;
            ctx.fillRect(x + 2, thumbY + 2, cw - 4, thumbH - 4);
        } else {
            // Horizontal
            const length = sb.length * cw;
            ctx.fillRect(x, y, length, ch);
            ctx.strokeRect(x + 0.5, y + 0.5, length - 1, ch - 1);
            const total = Math.max(sb.totalRows, 1);
            const visible = Math.max(sb.visibleRows, 1);
            const thumbW = Math.max(cw, (visible / total) * length);
            const thumbX = x + (sb.sliderPos / total) * length;
            ctx.fillStyle = COLOR.turquoise;
            ctx.fillRect(thumbX + 2, y + 2, thumbW - 4, ch - 4);
        }
        ctx.restore();
    }
}
