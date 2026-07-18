// 5250 colour palette + per-cell foreground / background resolution.

export const COLOR = {
    black:     '#000000',
    green:     '#33ff33',
    red:       '#ff4444',
    white:     '#ffffff',
    turquoise: '#5cf6ff',
    yellow:    '#ffff44',
    pink:      '#ff66cc',
    blue:      '#3399ff',
};

export function fgFor (cell) {
    if (cell.attr.hidden) return cell.attr.bg ? COLOR[cell.attr.bg] : '#000';
    return COLOR[cell.attr.fg] ?? COLOR.green;
}

export function bgFor (cell) {
    return COLOR[cell.attr.bg] ?? COLOR.black;
}
