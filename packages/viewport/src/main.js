import { Ledger, generateEd25519Identity, createProposal, castVote, assertSealAllowed, verifyChain, epochRoot } from '@ae11/runtime';

const identity = generateEd25519Identity();
const ledger = new Ledger();
let proposal = null;
const logEl = document.getElementById('log');
const ctx = document.getElementById('c').getContext('2d');

function log(msg) { logEl.textContent += `${msg}\n`; }

document.getElementById('plan').onclick = () => { proposal = createProposal({ prompt: 'viewport intent', plan: 'auto' }); castVote(proposal, identity.did, 'yea'); log('planned'); };
document.getElementById('render').onclick = () => {
  const b = ledger.append({ layer: 'æ2-compute', data: { render: 'deterministic-blob' }, nonce: crypto.randomUUID() }, identity);
  ctx.fillStyle = '#111'; ctx.fillRect(0,0,320,180); ctx.fillStyle = '#7ef'; ctx.fillText(b.hash.slice(0,16), 20, 80);
  log(`render ${b.hash}`);
};
document.getElementById('seal').onclick = () => {
  try { assertSealAllowed(proposal, 1); } catch (e) { log(e.message); return; }
  const b = ledger.append({ layer: 'æ6-seal', data: { sealed: true }, nonce: crypto.randomUUID() }, identity); log(`seal ${b.hash}`);
};
document.getElementById('epoch').onclick = () => log(`epoch ${epochRoot(ledger.blocks.filter((b) => b.layer === 'æ6-seal'))}`);
document.getElementById('verify').onclick = () => log(JSON.stringify(verifyChain(ledger.blocks)));
document.getElementById('export').onclick = () => log(JSON.stringify(ledger.blocks, null, 2));
