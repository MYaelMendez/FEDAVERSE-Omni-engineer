import { decodeBase58btc, encodeBase58btc } from './base58btc.js';

const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);

export function didKeyFromPublicKey(pubKeyBytes) {
  const prefixed = new Uint8Array(ED25519_PREFIX.length + pubKeyBytes.length);
  prefixed.set(ED25519_PREFIX);
  prefixed.set(pubKeyBytes, ED25519_PREFIX.length);
  return `did:key:${encodeBase58btc(prefixed)}`;
}

export function publicKeyFromDidKey(did) {
  if (!did.startsWith('did:key:')) throw new Error('Invalid DID:key format');
  const decoded = decodeBase58btc(did.replace('did:key:', ''));
  if (decoded[0] !== 0xed || decoded[1] !== 0x01) throw new Error('DID:key must carry Ed25519 multicodec prefix 0xed01');
  return decoded.slice(2);
}
