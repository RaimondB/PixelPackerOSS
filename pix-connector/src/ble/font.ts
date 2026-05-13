// Font data from original Pix Backpack APK (mod_0753).
// Each value is a base64-encoded 8×20 bitmap (20 bytes, one per row, LSB = leftmost pixel).

const FONT_B64: Record<string, string> = {
  ' ': 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  '!': 'AAAAAAAQEBAQEBAAEBAAAAAAAAA=',
  '"': 'AAAAJCQkJAAAAAAAAAAAAAAAAAA=',
  '#': 'AAAAAAAAKCj+KCj+KCgAAAAAAAA=',
  '$': 'AAAAABAQfJISfJCSfBAQAAAAAAA=',
  '%': 'AAAAAAAEikokEEikokAAAAAAAAA=',
  '&': 'AAAAAAAAHCIiHBKiQrwAAAAAAAA=',
  "'": 'AAAAEBAQEAAAAAAAAAAAAAAAAAA=',
  '(': 'AAAAACAQEAgICAgICAgQECAAAAA=',
  ')': 'AAAAAAgQECAgICAgICAQEAgAAAA=',
  '*': 'AAAAAAAAAAAQVDhUEAAAAAAAAAA=',
  '+': 'AAAAAAAAAAAQEHwQEAAAAAAAAAA=',
  ',': 'AAAAAAAAAAAAAAAAEBAIAAAAAAA=',
  '-': 'AAAAAAAAAAAAAHwAAAAAAAAAAAA=',
  '.': 'AAAAAAAAAAAAAAAAEBAAAAAAAAA=',
  '/': 'AAAAAEBAICAQEAgIBAQCAgAAAAA=',
  '0': 'AAAAAAA8QmJyWk5GQjwAAAAAAAA=',
  '1': 'AAAAAAAQHBAQEBAQEHwAAAAAAAA=',
  '2': 'AAAAAAA8QkBAPAICAn4AAAAAAAA=',
  '3': 'AAAAAAA8QkBAOEBAQjwAAAAAAAA=',
  '4': 'AAAAAAAgMCgkIn4gICAAAAAAAAA=',
  '5': 'AAAAAAB+AgI+QEBAQjwAAAAAAAA=',
  '6': 'AAAAAAA8AgI+QkJCQjwAAAAAAAA=',
  '7': 'AAAAAAB+QiAgEBAICAgAAAAAAAA=',
  '8': 'AAAAAAA8QkJCPEJCQjwAAAAAAAA=',
  '9': 'AAAAAAA8QkJCQnxAQDwAAAAAAAA=',
  ':': 'AAAAAAAAABAQAAAAEBAAAAAAAAA=',
  ';': 'AAAAAAAAABAQAAAAEBAIAAAAAAA=',
  '<': 'AAAAAAAAACAQCAQIECAAAAAAAAA=',
  '=': 'AAAAAAAAAAAAfAB8AAAAAAAAAAA=',
  '>': 'AAAAAAAAAAQIECAQCAQAAAAAAAA=',
  '?': 'AAAAAAA4REBAIBAAEBAAAAAAAAA=',
  '@': 'AAAAAAAAOESSqqpSBHgAAAAAAAA=',
  'A': 'AAAAAAA8QkJCQn5CQkIAAAAAAAA=',
  'B': 'AAAAAAA+QkJCPkJCQj4AAAAAAAA=',
  'C': 'AAAAAAB4hAICAgIChHgAAAAAAAA=',
  'D': 'AAAAAAA+QoKCgoKCQj4AAAAAAAA=',
  'E': 'AAAAAAB+AgICPgICAn4AAAAAAAA=',
  'F': 'AAAAAAB+AgICPgICAgIAAAAAAAA=',
  'G': 'AAAAAAB4hAICAuKChHgAAAAAAAA=',
  'H': 'AAAAAABCQkJCfkJCQkIAAAAAAAA=',
  'I': 'AAAAAAB8EBAQEBAQEHwAAAAAAAA=',
  'J': 'AAAAAAA4ICAgICAgIBwAAAAAAAA=',
  'K': 'AAAAAACCQiISDhIiQoIAAAAAAAA=',
  'L': 'AAAAAAACAgICAgICAn4AAAAAAAA=',
  'M': 'AAAAAACCgsbGqqqSkoIAAAAAAAA=',
  'N': 'AAAAAABGRkpKUlJiYkIAAAAAAAA=',
  'O': 'AAAAAAA4RIKCgoKCRDgAAAAAAAA=',
  'P': 'AAAAAAA+QkJCPgICAgIAAAAAAAA=',
  'Q': 'AAAAAAA4RIKCgoKCRDggwAAAAAA=',
  'R': 'AAAAAAA+QkJCPhIiQoIAAAAAAAA=',
  'S': 'AAAAAAB8ggICfICAgnwAAAAAAAA=',
  'T': 'AAAAAAD+EBAQEBAQEBAAAAAAAAA=',
  'U': 'AAAAAACCgoKCgoKCRDgAAAAAAAA=',
  'V': 'AAAAAACCgoJERCgoEBAAAAAAAAA=',
  'W': 'AAAAAACCgoKCkpKSkmwAAAAAAAA=',
  'X': 'AAAAAACCgkQoEChEgoIAAAAAAAA=',
  'Y': 'AAAAAACCgkQoEBAQEBAAAAAAAAA=',
  'Z': 'AAAAAAD+gEAgEAgEAv4AAAAAAAA=',
  '[': 'AAAAADgICAgICAgICAgICDgAAAA=',
  '\\': 'AAAAAAICBAQICBAQICBAQAAAAAA=',
  ']': 'AAAAADggICAgICAgICAgIDgAAAA=',
  '^': 'AAAAAAAAAAAQKEQAAAAAAAAAAAA=',
  '_': 'AAAAAAAAAAAAAAAAAH4AAAAAAAA=',
  '`': 'AAAAAAgQIAAAAAAAAAAAAAAAAAA=',
  'a': 'AAAAAAAAAAA8QHxCQnwAAAAAAAA=',
  'b': 'AAAAAAACAgI+QkJCQj4AAAAAAAA=',
  'c': 'AAAAAAAAAAA8QgICQjwAAAAAAAA=',
  'd': 'AAAAAABAQEB8QkJCQnwAAAAAAAA=',
  'e': 'AAAAAAAAAAA8Qn4CQjwAAAAAAAA=',
  'f': 'AAAAAABwCAg8CAgICAgAAAAAAAA=',
  'g': 'AAAAAAAAAAB8QkJCQnxAQDwAAAA=',
  'h': 'AAAAAAACAgI+QkJCQkIAAAAAAAA=',
  'i': 'AAAAAAAQEAAcEBAQEHwAAAAAAAA=',
  'j': 'AAAAAAAgIAA4ICAgICAgIBwAAAA=',
  'k': 'AAAAAAACAgIiEg4SIkIAAAAAAAA=',
  'l': 'AAAAAAAICAgICAgICDAAAAAAAAA=',
  'm': 'AAAAAAAAAABukpKSkpIAAAAAAAA=',
  'n': 'AAAAAAAAAAA+QkJCQkIAAAAAAAA=',
  'o': 'AAAAAAAAAAA8QkJCQjwAAAAAAAA=',
  'p': 'AAAAAAAAAAA+QkJCQj4CAgIAAAA=',
  'q': 'AAAAAAAAAAB8QkJCQnxAQEAAAAA=',
  'r': 'AAAAAAAAAAB4BAQEBAQAAAAAAAA=',
  's': 'AAAAAAAAAAA8AjxAQjwAAAAAAAA=',
  't': 'AAAAAAAACAg8CAgICDAAAAAAAAA=',
  'u': 'AAAAAAAAAABCQkJCQnwAAAAAAAA=',
  'v': 'AAAAAAAAAABEREREKBAAAAAAAAA=',
  'w': 'AAAAAAAAAACCgpKSkmwAAAAAAAA=',
  'x': 'AAAAAAAAAABGKBAYJMIAAAAAAAA=',
  'y': 'AAAAAAAAAABCQkJCQnxAQDwAAAA=',
  'z': 'AAAAAAAAAAB+IBAIBH4AAAAAAAA=',
  '{': 'AAAAAGAQEBAQEAwQEBAQEGAAAAA=',
  '|': 'AAAAABAQEBAQEBAQEBAQEBAAAAA=',
  '}': 'AAAAAAwQEBAQEGAQEBAQEAwAAAA=',
  '~': 'AAAAAAAAAAAATDIAAAAAAAAAAAA=',
};

/**
 * Convert a font bitmap (base64, 20 bytes = 20 rows of 8 pixels) into a
 * 16×20 frame byte array (8bpp palette indices).
 *
 * Each byte in the bitmap encodes one row: bit0=leftmost pixel (LSB first).
 * Pixels 0–7 come from the bitmap; pixels 8–15 are padding (background=0).
 * Pixel value: 0 = background (palette[0]), 1 = text color (palette[1]).
 */
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_TABLE = new Uint8Array(256).fill(255);
for (let i = 0; i < B64_CHARS.length; i++) B64_TABLE[B64_CHARS.charCodeAt(i)] = i;

function base64ToBytes(b64: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < b64.length; i += 4) {
    const a = B64_TABLE[b64.charCodeAt(i)];
    const b = B64_TABLE[b64.charCodeAt(i + 1)];
    const c = B64_TABLE[b64.charCodeAt(i + 2)];
    const e = B64_TABLE[b64.charCodeAt(i + 3)];
    out.push((a << 2) | (b >> 4));
    if (b64[i + 2] !== '=') out.push(((b & 0xf) << 4) | (c >> 2));
    if (b64[i + 3] !== '=') out.push(((c & 0x3) << 6) | e);
  }
  return out;
}

export function charToFrameBytes(ch: string): number[] | null {
  const b64 = FONT_B64[ch];
  if (!b64) return null;
  const bitmapBytes = base64ToBytes(b64); // 20 bytes, one per row
  const frameBytes: number[] = [];
  for (const rowByte of bitmapBytes) {
    // Expand 8 bits LSB-first → 8 palette-index bytes + 8 zero-padding bytes
    for (let bit = 0; bit < 8; bit++) {
      frameBytes.push((rowByte >> bit) & 1);
    }
    for (let pad = 0; pad < 8; pad++) {
      frameBytes.push(0);
    }
  }
  return frameBytes; // 320 bytes = 16×20
}

export function isCharSupported(ch: string): boolean {
  return ch in FONT_B64;
}

export { FONT_B64 };
