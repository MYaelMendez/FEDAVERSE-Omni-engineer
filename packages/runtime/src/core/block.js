import { stableStr } from '../crypto/stableStr.js';
import { sha256Hex } from '../crypto/sha256.js';
import { signEd25519 } from '../crypto/ed25519.js';

export const AE11_SCHEMA = 'com.yael.ae11.block';

export function createBlock(payload, context) {
  const body = {
    $schema: AE11_SCHEMA,
    $v: 1,
    did: context.did,
    prev: context.prev ?? null,
    nonce: context.nonce,
    ts: context.ts ?? Date.now(),
    layer: payload.layer,
    data: payload.data,
  };
  const canonical = stableStr(body);
  const hash = sha256Hex(canonical);
  const signature = Buffer.from(signEd25519(new TextEncoder().encode(hash), context.privateKey)).toString('hex');
  return { ...body, hash, signature };
}
