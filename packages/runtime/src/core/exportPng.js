import { stableStr } from '../crypto/stableStr.js';

function crc32(buf) {
  let crc = -1;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

export function embedProvenanceTextChunk(pngBytes, provenance) {
  const sig = pngBytes.slice(0, 8);
  const ihdrToBeforeIend = pngBytes.slice(8, pngBytes.length - 12);
  const iend = pngBytes.slice(pngBytes.length - 12);
  const keyword = 'provenance';
  const text = `${keyword}\0${stableStr(provenance)}`;
  const data = new TextEncoder().encode(text);
  const type = new TextEncoder().encode('tEXt');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const chunkNoCrc = Buffer.concat([type, Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(chunkNoCrc), 0);
  return new Uint8Array(Buffer.concat([Buffer.from(sig), Buffer.from(ihdrToBeforeIend), len, type, Buffer.from(data), crc, Buffer.from(iend)]));
}
