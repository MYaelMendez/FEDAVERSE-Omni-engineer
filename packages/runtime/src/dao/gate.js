import { hasQuorum } from './quorum.js';

export function assertSealAllowed(proposal, minimumYea = 2) {
  if (!hasQuorum(proposal, minimumYea)) {
    throw new Error('Seal blocked: DAO quorum not satisfied');
  }
}
