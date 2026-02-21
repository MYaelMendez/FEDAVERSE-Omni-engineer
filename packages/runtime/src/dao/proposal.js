export function createProposal(intent) {
  return { id: crypto.randomUUID(), intent, state: 'open', votes: [] };
}
