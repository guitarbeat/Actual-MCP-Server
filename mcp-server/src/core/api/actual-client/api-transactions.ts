/**
 * Transaction operations for the Actual Budget API.
 */
import '../../../polyfill.js';
import api from '@actual-app/api';
import type { ImportTransactionsOpts, TransactionEntity } from '../api-types.js';
import type {
  ExtendedActualApi,
  HistoricalTransferApplyCandidateResult,
  HistoricalTransferApplyResult,
  HistoricalTransferInternalTransaction,
} from './types.js';
import {
  getDateDiffInDays,
  parseHistoricalTransferCandidateId,
} from '../../analysis/historical-transfer-utils.js';
import { cacheService } from '../../cache/cache-service.js';
import { invalidateNameResolutionState } from './cache-helpers.js';
import { ensureConnection, runReadOperation } from './connection-guard.js';
import {
  getAllPotentialHistoricalTransferCounterparts,
  getBatchHistoricalTransferTransactions,
  getHistoricalTransferInternalLayer,
  isValidHistoricalTransferTransaction,
} from './historical-transfers.js';

const extendedApi: ExtendedActualApi = api as ExtendedActualApi;

// ── Reads ──────────────────────────────────────────────────────────────────────

/**
 * Get transactions for a specific account and date range (ensures API is initialized)
 */
export async function getTransactions(
  accountId: string,
  start: string,
  end: string,
): Promise<TransactionEntity[]> {
  return runReadOperation(() => api.getTransactions(accountId, start, end), {
    cacheKey: `transactions:${accountId}:${start}:${end}`,
  });
}

// ── Writes ─────────────────────────────────────────────────────────────────────

/**
 * Add transactions to an account (ensures API is initialized)
 */
export async function addTransactions(
  accountId: string,
  transactions: Array<{
    date: string;
    amount: number;
    payee?: string | null;
    category?: string | null;
    notes?: string;
    imported_id?: string;
    cleared?: boolean;
  }>,
  options?: { learnCategories?: boolean; runTransfers?: boolean },
): Promise<'ok'> {
  return ensureConnection(async () => {
    // @ts-expect-error - Transactions array structure matches what Actual API expects internally
    const result = await api.addTransactions(accountId, transactions, options);
    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Import transactions with duplicate detection and rule execution (ensures API is initialized)
 *
 * @param accountId - Account ID to import transactions into
 * @param transactions - Array of transactions to import
 * @param opts - Optional import options (e.g., defaultCleared)
 * @returns Result with added/updated transaction IDs and any errors
 */
export async function importTransactions(
  accountId: string,
  transactions: Array<{
    date: string;
    amount: number;
    payee?: string | null;
    payee_name?: string;
    imported_payee?: string;
    category?: string | null;
    notes?: string;
    imported_id?: string;
    cleared?: boolean;
    subtransactions?: Array<{
      amount: number;
      category?: string | null;
      notes?: string;
    }>;
  }>,
  opts?: ImportTransactionsOpts,
): Promise<{
  errors?: Array<{ message: string }>;
  added: string[];
  updated: string[];
}> {
  return ensureConnection(async () => {
    const transactionsWithAccount = transactions.map((transaction) => ({
      account: accountId,
      ...transaction,
      payee: transaction.payee ?? undefined,
      category: transaction.category ?? undefined,
      subtransactions: transaction.subtransactions?.map((subtransaction) => ({
        ...subtransaction,
        category: subtransaction.category ?? undefined,
      })),
    }));
    const result = await api.importTransactions(accountId, transactionsWithAccount, opts);

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((err: { message: string }) => err.message).join('; ');
      throw new Error(`importTransactions reported errors: ${errorMessages}`);
    }

    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();

    return result;
  }, 'write');
}

/**
 * Batch update transactions (ensures API is initialized)
 *
 * @param updates - Array of fields to update per transaction (must include id)
 * @returns Promise that resolves when updates are complete
 */
export async function batchUpdateTransactions(
  updates: Array<{ id: string } & Record<string, unknown>>,
): Promise<void> {
  return ensureConnection(async () => {
    const { send } = getHistoricalTransferInternalLayer(extendedApi);
    await send('transactions-batch-update', {
      updated: updates,
    });
    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
  }, 'write');
}

export async function updateTransaction(
  id: string,
  updates: Record<string, unknown>,
): Promise<void> {
  return ensureConnection(async () => {
    await api.updateTransaction(id, updates);
    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
  }, 'write');
}

/**
 * Delete a transaction (ensures API is initialized)
 *
 * @param id - Transaction ID to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteTransaction(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteTransaction(id);
    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
  }, 'write');
}

/**
 * Link already-imported transaction pairs as historical transfers using Actual's local data layer.
 * This intentionally bypasses the normal updateTransaction wrapper so it can link two existing rows
 * without creating duplicate counterpart transactions.
 */
export async function applyHistoricalTransfers(
  candidateIds: string[],
): Promise<HistoricalTransferApplyResult> {
  return ensureConnection(async () => {
    const { send, db } = getHistoricalTransferInternalLayer(extendedApi);
    const uniqueCandidateIds = [...new Set(candidateIds)];
    const [accounts, payees] = await Promise.all([api.getAccounts(), api.getPayees()]);
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    const transferPayeeByAccountId = new Map(
      payees
        .filter((payee) => typeof payee.transfer_acct === 'string' && payee.transfer_acct)
        .map((payee) => [payee.transfer_acct as string, payee.id]),
    );
    const reservedTransactionIds = new Set<string>();
    const results: HistoricalTransferApplyCandidateResult[] = [];

    // Pre-fetch all involved transactions in one batch
    const allCandidateTransactionIds = uniqueCandidateIds.flatMap((cid) => {
      try {
        return parseHistoricalTransferCandidateId(cid);
      } catch {
        return [];
      }
    });

    const allInvolvedTransactions = await getBatchHistoricalTransferTransactions(
      db,
      allCandidateTransactionIds,
    );
    const transactionsById = new Map(allInvolvedTransactions.map((tx) => [tx.id, tx]));

    // Pre-fetch all potential counterparts for all involved transactions in one batch
    const allPotentialCounterparts = await getAllPotentialHistoricalTransferCounterparts(
      db,
      allInvolvedTransactions,
    );

    // Index counterparts by amount and date for efficient O(1) lookup
    const counterpartsByAmount = new Map<number, HistoricalTransferInternalTransaction[]>();
    for (const counterpart of allPotentialCounterparts) {
      const existing = counterpartsByAmount.get(counterpart.amount) ?? [];
      existing.push(counterpart);
      counterpartsByAmount.set(counterpart.amount, existing);
    }

    for (const candidateId of uniqueCandidateIds) {
      try {
        const [firstTransactionId, secondTransactionId] =
          parseHistoricalTransferCandidateId(candidateId);

        if (
          reservedTransactionIds.has(firstTransactionId) ||
          reservedTransactionIds.has(secondTransactionId)
        ) {
          results.push({
            candidateId,
            transactionIds: [firstTransactionId, secondTransactionId],
            status: 'rejected',
            reason: 'At least one transaction in this request appears in multiple candidate pairs.',
          });
          continue;
        }

        const firstTransaction = transactionsById.get(firstTransactionId);
        const secondTransaction = transactionsById.get(secondTransactionId);

        if (
          !isValidHistoricalTransferTransaction(firstTransaction ?? null) ||
          !isValidHistoricalTransferTransaction(secondTransaction ?? null)
        ) {
          results.push({
            candidateId,
            transactionIds: [firstTransactionId, secondTransactionId],
            status: 'rejected',
            reason:
              'One or both transactions are missing, already linked, split, deleted, or starting-balance entries.',
          });
          continue;
        }

        // TypeScript safety after isValidHistoricalTransferTransaction check
        const tx1 = firstTransaction!;
        const tx2 = secondTransaction!;

        if (tx1.account === tx2.account) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason: 'Historical transfer pairs must come from different accounts.',
          });
          continue;
        }

        if (tx1.amount !== tx2.amount * -1) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason: 'Historical transfer pairs must have exact inverse amounts.',
          });
          continue;
        }

        if (Math.abs(getDateDiffInDays(tx1.date, tx2.date)) > 3) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason: 'Historical transfer pairs must fall within 3 days of each other.',
          });
          continue;
        }

        // Efficient in-memory counterpart lookup
        const findCounterparts = (tx: HistoricalTransferInternalTransaction) => {
          const inverseAmount = tx.amount * -1;
          const matches = counterpartsByAmount.get(inverseAmount) ?? [];
          return matches
            .filter(
              (m) =>
                m.id !== tx.id &&
                m.account !== tx.account &&
                Math.abs(getDateDiffInDays(tx.date, m.date)) <= 3,
            )
            .map((m) => m.id);
        };

        const firstCounterpartIds = findCounterparts(tx1);
        const secondCounterpartIds = findCounterparts(tx2);

        if (
          firstCounterpartIds.length !== 1 ||
          firstCounterpartIds[0] !== tx2.id ||
          secondCounterpartIds.length !== 1 ||
          secondCounterpartIds[0] !== tx1.id
        ) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason:
              'This candidate no longer has a unique exact inverse counterpart, so it cannot be linked safely.',
          });
          continue;
        }

        const firstTransferPayeeId = transferPayeeByAccountId.get(tx2.account);
        const secondTransferPayeeId = transferPayeeByAccountId.get(tx1.account);

        if (!firstTransferPayeeId || !secondTransferPayeeId) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason: 'A required transfer payee was not found for one of the accounts in this pair.',
          });
          continue;
        }

        const firstAccount = accountsById.get(tx1.account);
        const secondAccount = accountsById.get(tx2.account);
        const categoriesCleared =
          Boolean(firstAccount?.offbudget) === Boolean(secondAccount?.offbudget);

        await send('transactions-batch-update', {
          updated: [
            {
              id: tx1.id,
              payee: firstTransferPayeeId,
              transfer_id: tx2.id,
              ...(categoriesCleared ? { category: null } : {}),
            },
            {
              id: tx2.id,
              payee: secondTransferPayeeId,
              transfer_id: tx1.id,
              ...(categoriesCleared ? { category: null } : {}),
            },
          ],
          runTransfers: false,
        });

        reservedTransactionIds.add(tx1.id);
        reservedTransactionIds.add(tx2.id);
        results.push({
          candidateId,
          transactionIds: [tx1.id, tx2.id],
          status: 'applied',
          categoriesCleared,
        });
      } catch (error) {
        results.push({
          candidateId,
          transactionIds: (() => {
            try {
              const [firstTransactionId, secondTransactionId] =
                parseHistoricalTransferCandidateId(candidateId);
              return [firstTransactionId, secondTransactionId] as [string, string];
            } catch {
              return [candidateId, candidateId];
            }
          })(),
          status: 'rejected',
          reason: error instanceof Error ? error.message : String(error ?? 'unknown error'),
        });
      }
    }

    if (results.some((result) => result.status === 'applied')) {
      cacheService.invalidatePattern('transactions:*');
      cacheService.invalidate('accounts:all');
      invalidateNameResolutionState();
    }

    return {
      requestedCandidateCount: uniqueCandidateIds.length,
      appliedCount: results.filter((result) => result.status === 'applied').length,
      rejectedCount: results.filter((result) => result.status === 'rejected').length,
      results,
    };
  }, 'write');
}
