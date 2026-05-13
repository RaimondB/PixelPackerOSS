export function toUint16Bytes(n: number): [number, number] {
  return [n & 0xff, (n >> 8) & 0xff];
}

export function bytesToUnsignedNumber(bytes: number[]): number {
  return bytes.reduce((acc, byte, i) => acc + byte * Math.pow(256, i), 0);
}

export function bytesToString(bytes: number[]): string {
  return bytes.map(b => String.fromCharCode(b)).join('');
}
