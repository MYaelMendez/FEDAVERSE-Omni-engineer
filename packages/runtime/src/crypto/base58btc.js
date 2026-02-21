const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const MAP = new Map([...ALPHABET].map((c, i) => [c, i]));

export function encodeBase58btc(bytes) {
  let x = 0n;
  for (const b of bytes) x = (x << 8n) + BigInt(b);
  let out = '';
  while (x > 0n) {
    const mod = Number(x % 58n);
    out = ALPHABET[mod] + out;
    x /= 58n;
  }
  for (const b of bytes) { if (b === 0) out = `1${out}`; else break; }
  return `z${out || '1'}`;
}

export function decodeBase58btc(value) {
  if (!value.startsWith('z')) throw new Error('Expected multibase base58btc string');
  const s = value.slice(1);
  let x = 0n;
  for (const c of s) {
    const v = MAP.get(c);
    if (v === undefined) throw new Error('Invalid base58btc character');
    x = x * 58n + BigInt(v);
  }
  const bytes = [];
  while (x > 0n) { bytes.unshift(Number(x & 0xffn)); x >>= 8n; }
  for (const c of s) { if (c === '1') bytes.unshift(0); else break; }
  return new Uint8Array(bytes);
}
