import { createBlock } from './block.js';

export class Ledger {
  constructor() {
    this.blocks = [];
    this.nonces = new Set();
  }

  append(payload, identity) {
    if (this.nonces.has(payload.nonce)) throw new Error('Nonce replay detected');
    const block = createBlock(payload, {
      did: identity.did,
      privateKey: identity.privateKey,
      prev: this.blocks.at(-1)?.hash ?? null,
      nonce: payload.nonce,
      ts: payload.ts,
    });
    this.blocks.push(block);
    this.nonces.add(payload.nonce);
    return block;
  }
}
