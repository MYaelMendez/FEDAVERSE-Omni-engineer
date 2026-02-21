import { stableStr } from '../crypto/stableStr.js';
import { sha256Hex } from '../crypto/sha256.js';
import { verifyEd25519FromDid } from '../crypto/ed25519.js';

export function verifyChain(blocks) {
  const nonceSet = new Set();
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (nonceSet.has(block.nonce)) return { ok: false, reason: 'nonce replay' };
    nonceSet.add(block.nonce);
    const expectedPrev = i === 0 ? null : blocks[i - 1].hash;
    if (block.prev !== expectedPrev) return { ok: false, reason: 'broken prev linkage' };

    const canonical = stableStr({
      $schema: block.$schema,
      $v: block.$v,
      did: block.did,
      prev: block.prev,
      nonce: block.nonce,
      ts: block.ts,
      layer: block.layer,
      data: block.data,
    });
    const hash = sha256Hex(canonical);
    if (hash !== block.hash) return { ok: false, reason: 'hash mismatch' };
    const verified = verifyEd25519FromDid(new TextEncoder().encode(hash), Buffer.from(block.signature, 'hex'), block.did);
    if (!verified) return { ok: false, reason: 'signature invalid' };
  }
  return { ok: true };
}
