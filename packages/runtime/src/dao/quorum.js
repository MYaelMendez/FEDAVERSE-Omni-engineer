export function hasQuorum(proposal, minimumYea = 2) {
  return proposal.votes.filter((v) => v.choice === 'yea').length >= minimumYea;
}
