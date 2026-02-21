import { sha256Hex } from '../crypto/sha256.js';

function merkleLevel(nodes) {
  if (nodes.length === 1) return nodes;
  const next = [];
  for (let i = 0; i < nodes.length; i += 2) {
    const left = nodes[i];
    const right = nodes[i + 1] ?? nodes[i];
    next.push(sha256Hex(`${left}${right}`));
  }
  return merkleLevel(next);
}

export function epochRoot(sealBlocks) {
  if (!sealBlocks.length) return null;
  return merkleLevel(sealBlocks.map((b) => b.hash))[0];
}
