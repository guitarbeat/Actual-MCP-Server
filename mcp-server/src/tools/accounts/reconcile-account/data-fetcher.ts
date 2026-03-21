import {
  getAccountBalance,
  updateTransaction,
} from '../../../core/api/actual-client.js';
import { fetchAllAccounts } from '../../../core/data/fetch-accounts.js';
import { fetchTransactionsForAccount } from '../../../core/data/fetch-transactions.js';
import { nameResolver } from '../../../core/utils/name-resolver.js';
import type {
  ReconciliationSnapshot,
  ReconciliationTransaction,
} from './types.js';

const RECONCILIATION_START_DATE = '1900-01-01';

function isRelevantTransaction(transaction: ReconciliationTransaction, statementDate: string): boolean {
  return !transaction.is_child && transaction.date <= statementDate;
}

function isEligibleForClearing(
  transaction: ReconciliationTransaction,
  statementDate: string,
): boolean {
  return (
    isRelevantTransaction(transaction, statementDate) &&
    !transaction.cleared &&
    !transaction.starting_balance_flag
  );
}

export class ReconcileAccountDataFetcher {
  async fetchSnapshot(
    accountReference: string,
    statementDate: string,
    statementBalanceCents: number,
  ): Promise<ReconciliationSnapshot> {
    const accountId = await nameResolver.resolveAccount(accountReference);
    const accounts = await fetchAllAccounts();
    const account = accounts.find((candidate) => candidate.id === accountId);

    if (!account) {
      throw new Error(`Account '${accountReference}' could not be loaded for reconciliation.`);
    }

    const transactions = (await fetchTransactionsForAccount(
      accountId,
      RECONCILIATION_START_DATE,
      statementDate,
      { accountIdIsResolved: true },
    )) as ReconciliationTransaction[];
    const actualBalanceCents = await getAccountBalance(accountId, statementDate);

    const relevantTransactions = transactions.filter((transaction) =>
      isRelevantTransaction(transaction, statementDate),
    );
    const clearedTransactions = relevantTransactions.filter((transaction) => transaction.cleared);
    const unclearedTransactions = relevantTransactions.filter((transaction) => !transaction.cleared);
    const eligibleTransactions = relevantTransactions.filter((transaction) =>
      isEligibleForClearing(transaction, statementDate),
    );

    const futureTransactionsIgnored = transactions.filter((transaction) => transaction.date > statementDate).length;
    const clearedBalanceCents = clearedTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const unclearedBalanceCents = unclearedTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    return {
      accountId,
      accountName: account.name,
      statementDate,
      statementBalanceCents,
      actualBalanceCents,
      clearedBalanceCents,
      unclearedBalanceCents,
      differenceCents: statementBalanceCents - actualBalanceCents,
      eligibleTransactions,
      unclearedTransactions,
      futureTransactionsIgnored,
    };
  }

  async clearTransactions(transactions: ReconciliationTransaction[]): Promise<number> {
    const results = await Promise.allSettled(
      transactions.map(async (transaction) => updateTransaction(transaction.id, { cleared: true })),
    );

    return results.filter((result) => result.status === 'fulfilled').length;
  }
}
