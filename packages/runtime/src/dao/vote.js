export function castVote(proposal, voterDid, choice) {
  if (proposal.state !== 'open') throw new Error('Proposal is not open');
  const filtered = proposal.votes.filter((v) => v.voterDid !== voterDid);
  proposal.votes = [...filtered, { voterDid, choice }];
  return proposal;
}
