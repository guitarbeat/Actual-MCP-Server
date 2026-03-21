import { formatAmount } from '../../../core/formatting/index.js';
import type { ReconciliationReport, ReconciliationSnapshot } from './types.js';

function buildReasons(snapshot: ReconciliationSnapshot, forceClear: boolean): string[] {
  if (snapshot.differenceCents === 0) {
    return ['Statement balance matches Actual account balance.'];
  }

  if (forceClear) {
    return [
      'Eligible transactions were cleared because forceClear was enabled.',
      'Review starting balances, missing imports, or duplicate transactions if the balance is still off.',
    ];
  }

  return [
    'Statement balance does not match Actual account balance.',
    'Review missing transactions, duplicate imports, or starting balances before clearing anything.',
  ];
}

export class ReconcileAccountReportGenerator {
  generate(
    snapshot: ReconciliationSnapshot,
    transactionsCleared: number,
    forceClear: boolean,
  ): ReconciliationReport {
    const status =
      snapshot.differenceCents === 0 ? 'balanced' : forceClear ? 'forced-clear' : 'out-of-balance';

    return {
      accountId: snapshot.accountId,
      accountName: snapshot.accountName,
      statementDate: snapshot.statementDate,
      statementBalance: formatAmount(snapshot.statementBalanceCents),
      actualBalance: formatAmount(snapshot.actualBalanceCents),
      clearedBalance: formatAmount(snapshot.clearedBalanceCents),
      unclearedBalance: formatAmount(snapshot.unclearedBalanceCents),
      difference: formatAmount(snapshot.differenceCents),
      status,
      transactionsCleared,
      futureTransactionsIgnored: snapshot.futureTransactionsIgnored,
      reasons: buildReasons(snapshot, forceClear),
      unclearedTransactions: snapshot.unclearedTransactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.date,
        payee: transaction.payee_name || '(No payee)',
        amount: formatAmount(transaction.amount),
        notes: transaction.notes || '',
      })),
    };
  }
}
