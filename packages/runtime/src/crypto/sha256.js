import { createHash } from 'node:crypto';
export function sha256Hex(input) {
  const bytes = typeof input === 'string' ? input : Buffer.from(input);
  return createHash('sha256').update(bytes).digest('hex');
}
