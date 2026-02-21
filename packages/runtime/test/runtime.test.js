import test from 'node:test';
import assert from 'node:assert/strict';
import { stableStr, didKeyFromPublicKey, publicKeyFromDidKey, generateEd25519Identity, signEd25519, verifyEd25519FromDid, Ledger, verifyChain, createProposal, assertSealAllowed, castVote, embedProvenanceTextChunk } from '../src/index.js';

test('stableStr canonicalization', () => {
  assert.equal(stableStr({ b: 1, a: 2 }), '{"a":2,"b":1}');
});

test('did:key encode/decode with 0xed01', () => {
  const id = generateEd25519Identity();
  const did = didKeyFromPublicKey(id.publicKey);
  assert.ok(did.startsWith('did:key:z'));
  assert.deepEqual(publicKeyFromDidKey(did), id.publicKey);
});

test('Ed25519 sign/verify', () => {
  const id = generateEd25519Identity();
  const msg = new TextEncoder().encode('hello');
  const sig = signEd25519(msg, id.privateKey);
  assert.equal(verifyEd25519FromDid(msg, sig, id.did), true);
});

test('ledger append + verify integrity and replay/tamper rejection', () => {
  const id = generateEd25519Identity();
  const ledger = new Ledger();
  ledger.append({ layer: 'æ1-intent', data: {}, nonce: 'n1' }, id);
  ledger.append({ layer: 'æ2-compute', data: {}, nonce: 'n2' }, id);
  assert.equal(verifyChain(ledger.blocks).ok, true);
  const tampered = structuredClone(ledger.blocks); tampered[1].data = { bad: true };
  assert.equal(verifyChain(tampered).ok, false);
  assert.throws(() => ledger.append({ layer: 'æ3-envelope', data: {}, nonce: 'n2' }, id));
});

test('DAO gating', () => {
  const id = generateEd25519Identity();
  const proposal = createProposal({ prompt: 'x' });
  assert.throws(() => assertSealAllowed(proposal, 1));
  castVote(proposal, id.did, 'yea');
  assert.doesNotThrow(() => assertSealAllowed(proposal, 1));
});

test('PNG provenance metadata tEXt chunk', () => {
  const tinyPng = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8ffff3f0005fe02fea7d6059d0000000049454e44ae426082','hex');
  const out = embedProvenanceTextChunk(new Uint8Array(tinyPng), { schema:'com.yael.ae11.block', v:1, did:'did:key:z', head:'h', epoch:'e', plan:'p', render:'r', seal:'s', prev_seal:null, epoch_root:'er', ts:1 });
  assert.equal(Buffer.from(out).toString('latin1').includes('provenance'), true);
});
