export async function createBrowserNodeIdentity() {
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto unavailable for non-extractable Ed25519 keys');
  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
  return keyPair;
}
