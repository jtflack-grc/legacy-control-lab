// 3279-class colour palette + per-cell foreground/background resolution.

export const COLOR_3270 = {
    0xF0: '#000000', 0xF1: '#3399FF', 0xF2: '#FF4444', 0xF3: '#FF66CC',
    0xF4: '#33FF33', 0xF5: '#33FFFF', 0xF6: '#FFFF44', 0xF7: '#FFFFFF',
    0xF8: '#000000', 0xF9: '#000080', 0xFA: '#FF8800', 0xFB: '#9966FF',
    0xFC: '#99FF99', 0xFD: '#99FFFF', 0xFE: '#999999', 0xFF: '#FFFFFF',
};

/** Base 3279 palette derived from FA bits when no extended colour was set. */
export function baseColor (cell) {
    if (cell.protected && cell.intensified) return '#FFFFFF';
    if (cell.protected)                     return '#3399FF';
    if (cell.intensified)                   return '#FF4444';
    return '#33FF33';
}

export function fgFor (cell) {
    if (cell.hidden) return '#000000';
    if (cell.foreground >= 0xF1 && cell.foreground <= 0xFF)
        return COLOR_3270[cell.foreground] ?? baseColor(cell);
    return baseColor(cell);
}

export function bgFor (cell) {
    if (cell.background >= 0xF1 && cell.background <= 0xFF)
        return COLOR_3270[cell.background] ?? '#000000';
    return '#000000';
}
