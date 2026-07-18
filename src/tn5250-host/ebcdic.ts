/** EBCDIC CP037 encode/decode for US English 5250 sessions. */

const ASCII_TO_EBCDIC = new Uint8Array(256);
const EBCDIC_TO_ASCII = new Uint8Array(256);

function initTables(): void {
  const pairs: Array<[string, number]> = [
    [" ", 0x40],
    ["a", 0x81], ["b", 0x82], ["c", 0x83], ["d", 0x84], ["e", 0x85],
    ["f", 0x86], ["g", 0x87], ["h", 0x88], ["i", 0x89], ["j", 0x91],
    ["k", 0x92], ["l", 0x93], ["m", 0x94], ["n", 0x95], ["o", 0x96],
    ["p", 0x97], ["q", 0x98], ["r", 0x99], ["s", 0xa2], ["t", 0xa3],
    ["u", 0xa4], ["v", 0xa5], ["w", 0xa6], ["x", 0xa7], ["y", 0xa8],
    ["z", 0xa9],
    ["A", 0xc1], ["B", 0xc2], ["C", 0xc3], ["D", 0xc4], ["E", 0xc5],
    ["F", 0xc6], ["G", 0xc7], ["H", 0xc8], ["I", 0xc9], ["J", 0xd1],
    ["K", 0xd2], ["L", 0xd3], ["M", 0xd4], ["N", 0xd5], ["O", 0xd6],
    ["P", 0xd7], ["Q", 0xd8], ["R", 0xd9], ["S", 0xe2], ["T", 0xe3],
    ["U", 0xe4], ["V", 0xe5], ["W", 0xe6], ["X", 0xe7], ["Y", 0xe8],
    ["Z", 0xe9],
    ["0", 0xf0], ["1", 0xf1], ["2", 0xf2], ["3", 0xf3], ["4", 0xf4],
    ["5", 0xf5], ["6", 0xf6], ["7", 0xf7], ["8", 0xf8], ["9", 0xf9],
    [".", 0x4b], [",", 0x6b], [":", 0x7a], [";", 0x5e], ["'", 0x7d],
    ["\"", 0x7f], ["(", 0x4d], [")", 0x5d], ["&", 0x50], ["%", 0x6c],
    ["+", 0x4e], ["-", 0x60], ["*", 0x5c], ["/", 0x61], ["=", 0x7e],
    ["<", 0x4c], [">", 0x6e], ["?", 0x6f], ["!", 0x5a], ["#", 0x7b],
    ["@", 0x7c], ["$", 0x5b], ["_", 0x6d],
  ];

  for (let i = 0; i < 256; i++) {
    ASCII_TO_EBCDIC[i] = 0x40;
    EBCDIC_TO_ASCII[i] = 0x3f;
  }

  for (const [ascii, ebcdic] of pairs) {
    ASCII_TO_EBCDIC[ascii.charCodeAt(0)] = ebcdic;
    EBCDIC_TO_ASCII[ebcdic] = ascii.charCodeAt(0);
  }
}

initTables();

export function asciiToEbcdic(text: string): Buffer {
  const out = Buffer.alloc(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = ASCII_TO_EBCDIC[text.charCodeAt(i)] ?? 0x40;
  }
  return out;
}

export function ebcdicToAscii(data: Buffer | Uint8Array): string {
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(EBCDIC_TO_ASCII[data[i] ?? 0x40] ?? 0x3f);
  }
  return result;
}

export function ebcdicToAsciiTrimmed(data: Buffer | Uint8Array): string {
  return ebcdicToAscii(data).trimEnd();
}
