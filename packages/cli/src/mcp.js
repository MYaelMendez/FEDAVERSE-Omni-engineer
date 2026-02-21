#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Ledger, generateEd25519Identity, createProposal, castVote, assertSealAllowed, verifyChain, epochRoot, stableStr } from '@ae11/runtime';

const [, , cmd, ...rest] = process.argv;
const stateDir = path.join(process.cwd(), '.mcp');
const stateFile = path.join(stateDir, 'state.json');

const help = `mcp plan "..."\nmcp render\nmcp vote yea|nay\nmcp seal\nmcp verify\nmcp export-ledger`;
if (!cmd || cmd === '--help') { console.log(help); process.exit(0); }

const load = () => (fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : { identity: null, blocks: [], proposal: null });
const save = (state) => { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(stateFile, JSON.stringify(state, null, 2)); };
const ensureIdentity = (state) => {
  if (!state.identity) {
    const i = generateEd25519Identity();
    state.identity = { did: i.did, privateKey: Buffer.from(i.privateKey).toString('hex') };
  }
  return { did: state.identity.did, privateKey: Buffer.from(state.identity.privateKey, 'hex') };
};
const state = load();
if (cmd === 'plan') { state.proposal = createProposal({ prompt: rest.join(' '), plan: `auto:${rest.join(' ')}` }); save(state); console.log('planned'); }
else if (cmd === 'render') { const id = ensureIdentity(state); const ledger = new Ledger(); ledger.blocks = state.blocks; const b = ledger.append({ layer: 'æ2-compute', data: { render: 'deterministic-blob' }, nonce: crypto.randomUUID() }, id); state.blocks = ledger.blocks; save(state); console.log(b.hash); }
else if (cmd === 'vote') { const id = ensureIdentity(state); state.proposal = castVote(state.proposal, id.did, rest[0]); save(state); console.log('voted'); }
else if (cmd === 'seal') { const id = ensureIdentity(state); assertSealAllowed(state.proposal, 1); const ledger = new Ledger(); ledger.blocks = state.blocks; const b = ledger.append({ layer: 'æ6-seal', data: { seal: true }, nonce: crypto.randomUUID() }, id); state.blocks = ledger.blocks; save(state); console.log(b.hash); }
else if (cmd === 'verify') { console.log(JSON.stringify(verifyChain(state.blocks))); }
else if (cmd === 'export-ledger') { console.log(stableStr({ did: state.identity?.did, head: state.blocks.at(-1)?.hash ?? null, blocks: state.blocks.length, epoch: epochRoot(state.blocks.filter((b) => b.layer === 'æ6-seal')) })); }
else { console.log(help); process.exit(1); }
