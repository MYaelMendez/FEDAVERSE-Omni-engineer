import { verifyChain } from '@ae11/runtime';

export function renderTerminalLedger(ledger) {
  const status = verifyChain(ledger);
  return `${status.ok ? '✔' : '✖'} blocks=${ledger.length}`;
}
