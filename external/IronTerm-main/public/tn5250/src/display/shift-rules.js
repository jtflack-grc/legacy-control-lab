// FFW data-shift enforcement helpers.
//
// EBCDIC code-point ranges referenced by the 5250 input policy. Used
// by ScreenBuffer.typeByte() to refuse keystrokes that don't match the
// field's declared shift type.

import { Shift } from '../proto/Constants.js';

export const EBC_DIGITS_MIN = 0xF0;     // '0'
export const EBC_DIGITS_MAX = 0xF9;     // '9'
export const EBC_SPACE      = 0x40;
export const EBC_DOT        = 0x4B;
export const EBC_COMMA      = 0x6B;
export const EBC_PLUS       = 0x4E;
export const EBC_MINUS      = 0x60;

export function isEbcdicDigit (b) { return b >= EBC_DIGITS_MIN && b <= EBC_DIGITS_MAX; }
export function isEbcdicUpper (b) {
    return (b >= 0xC1 && b <= 0xC9) || (b >= 0xD1 && b <= 0xD9) || (b >= 0xE2 && b <= 0xE9);
}
export function isEbcdicLower (b) {
    return (b >= 0x81 && b <= 0x89) || (b >= 0x91 && b <= 0x99) || (b >= 0xA2 && b <= 0xA9);
}
export function isEbcdicLetter (b) { return isEbcdicUpper(b) || isEbcdicLower(b); }
export function isSignChar (b)     { return b === EBC_DOT || b === EBC_COMMA || b === EBC_MINUS || b === EBC_PLUS || b === EBC_SPACE; }

/** Decide whether `byte` is acceptable in a field with the given FFW
 *  shift-type. Follows the IBM 5250 reference:
 *
 *   DATA_ALL      0  - any printable byte allowed
 *   DATA_X        1  - alpha shift; anything printable (uppercased
 *                      where applicable, but caller handles monocase)
 *   DATA_A        2  - alpha only: letters + space + . , -
 *   DATA_N        3  - numeric shift: same as DATA_ALL today
 *   DATA_S        4  - numeric only: digits, space, . , - +
 *   DATA_DIGITS   5  - digits 0-9 ONLY
 *   DATA_DBCS     6  - double-byte; we don't policy-check
 *   DATA_SIGNED_N 7  - digits and minus sign only */
export function acceptsByShift (byte, shift) {
    if (byte < 0x40) return false;        // control bytes never accepted
    switch (shift) {
        case Shift.DATA_ALL:
        case Shift.DATA_X:
        case Shift.DATA_N:
        case Shift.DATA_DBCS:
            return true;
        case Shift.DATA_A:
            return isEbcdicLetter(byte) || byte === EBC_SPACE
                || byte === EBC_DOT || byte === EBC_COMMA || byte === EBC_MINUS;
        case Shift.DATA_S:
            return isEbcdicDigit(byte) || isSignChar(byte);
        case Shift.DATA_DIGITS:
            return isEbcdicDigit(byte);
        case Shift.DATA_SIGNED_N:
            return isEbcdicDigit(byte) || byte === EBC_MINUS;
        default:
            return true;
    }
}
