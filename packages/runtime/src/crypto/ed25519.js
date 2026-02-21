import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { didKeyFromPublicKey, publicKeyFromDidKey } from './didkey.js';

const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function ensureEd25519() {
  if (!globalThis.crypto) throw new Error('Ed25519 unavailable: runtime requires Ed25519 support and does not provide fallbacks');
}

export function generateEd25519Identity() {
  ensureEd25519();
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privateKeyDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  const publicDer = publicKey.export({ type: 'spki', format: 'der' });
  const publicKeyRaw = new Uint8Array(publicDer.slice(-32));
  return { privateKey: new Uint8Array(privateKeyDer), publicKey: publicKeyRaw, did: didKeyFromPublicKey(publicKeyRaw) };
}

export function signEd25519(message, privateKeyBytes) {
  const key = createPrivateKey({ key: Buffer.from(privateKeyBytes), format: 'der', type: 'pkcs8' });
  return new Uint8Array(sign(null, Buffer.from(message), key));
}

export function verifyEd25519FromDid(message, signature, did) {
  const raw = Buffer.from(publicKeyFromDidKey(did));
  const pub = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, raw]), format: 'der', type: 'spki' });
  return verify(null, Buffer.from(message), pub, Buffer.from(signature));
}
