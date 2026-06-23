import '../../../polyfill.js';
import api from '@actual-app/api';
import type { ImportTransactionsOpts, RuleEntity } from '../api-types.js';
import type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
  APITagEntity,
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
import { loadBudgetByResolvedIdentifier } from './budget-resolution.js';
import { invalidateAllReadState, invalidateNameResolutionState } from './cache-helpers.js';
import {
  getAllPotentialHistoricalTransferCounterparts,
  getBatchHistoricalTransferTransactions,
  getHistoricalTransferInternalLayer,
  isValidHistoricalTransferTransaction,
} from './historical-transfers.js';
import { ensureConnection, markConnectionReady, markSyncSuccess } from './connection.js';

const extendedApi: ExtendedActualApi = api as ExtendedActualApi;

// ----------------------------
// ACTION
// ----------------------------

/**
 * Create a new payee (ensures API is initialized)
 */
export async function createPayee(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    // * Ensure name is provided as required by the API
    if (!args.name || typeof args.name !== 'string') {
      throw new Error('Payee name is required');
    }
    const result = await api.createPayee(args as Omit<APIPayeeEntity, 'id'>);
    cacheService.invalidatePattern('payees:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update a payee (ensures API is initialized)
 */
export async function updatePayee(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updatePayee(id, args);
    cacheService.invalidatePattern('payees:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete a payee (ensures API is initialized)
 */
export async function deletePayee(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.deletePayee(id);
    cacheService.invalidatePattern('payees:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Create a new rule (ensures API is initialized)
 */
export async function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return ensureConnection(() => api.createRule(args as Omit<RuleEntity, 'id'>), 'write');
}

/**
 * Create a new tag (ensures API is initialized)
 */
export async function createTag(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    if (!args.tag || typeof args.tag !== 'string') {
      throw new Error('Tag label is required');
    }

    const result = await api.createTag(args as Omit<APITagEntity, 'id'>);
    cacheService.invalidatePattern('tags:*');
    return result;
  }, 'write');
}

/**
 * Update a tag (ensures API is initialized)
 */
export async function updateTag(id: string, args: Record<string, unknown>): Promise<void> {
  return ensureConnection(async () => {
    await api.updateTag(id, args as Partial<Omit<APITagEntity, 'id'>>);
    cacheService.invalidatePattern('tags:*');
  }, 'write');
}

/**
 * Delete a tag (ensures API is initialized)
 */
export async function deleteTag(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteTag(id);
    cacheService.invalidatePattern('tags:*');
  }, 'write');
}

/**
 * Update a rule (ensures API is initialized)
 */
export async function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return ensureConnection(() => api.updateRule(args as unknown as RuleEntity), 'write');
}

/**
 * Delete a rule (ensures API is initialized)
 */
export async function deleteRule(id: string): Promise<boolean> {
  return ensureConnection(() => api.deleteRule(id), 'write');
}

/**
 * Create a new category (ensures API is initialized)
 */
export async function createCategory(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createCategory(args as Omit<APICategoryEntity, 'id'>);
    cacheService.invalidatePattern('categories:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update a category (ensures API is initialized)
 */
export async function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateCategory(id, args);
    cacheService.invalidatePattern('categories:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete a category (ensures API is initialized)
 */
export async function deleteCategory(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteCategory(id);
    cacheService.invalidatePattern('categories:*');
    invalidateNameResolutionState();
  }, 'write');
}

/**
 * Create a new category group (ensures API is initialized)
 */
export async function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createCategoryGroup(args as Omit<APICategoryGroupEntity, 'id'>);
    cacheService.invalidatePattern('categoryGroups:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update a category group (ensures API is initialized)
 */
export async function updateCategoryGroup(
  id: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateCategoryGroup(id, args);
    cacheService.invalidatePattern('categoryGroups:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete a category group (ensures API is initialized)
 */
export async function deleteCategoryGroup(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteCategoryGroup(id);
    cacheService.invalidatePattern('categoryGroups:*');
    invalidateNameResolutionState();
  }, 'write');
}

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

/**
 * Create a new account (ensures API is initialized)
 */
export async function createAccount(args: Record<string, unknown>): Promise<string> {
  return createAccountWithInitialBalance(args);
}

/**
 * Create a new account with optional initial balance (ensures API is initialized)
 */
export async function createAccountWithInitialBalance(
  args: Record<string, unknown>,
  initialBalance?: number,
): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createAccount(args as Omit<APIAccountEntity, 'id'>, initialBalance);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update an account (ensures API is initialized)
 */
export async function updateAccount(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateAccount(id, args);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Close an account (ensures API is initialized)
 */
export async function closeAccount(
  id: string,
  transferAccountId?: string,
  transferCategoryId?: string,
): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.closeAccount(id, transferAccountId, transferCategoryId);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Reopen a closed account (ensures API is initialized)
 */
export async function reopenAccount(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.reopenAccount(id);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete an account (ensures API is initialized)
 */
export async function deleteAccount(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.deleteAccount(id);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Set budget amount for a category in a specific month (ensures API is initialized)
 */
export async function setBudgetAmount(
  month: string,
  categoryId: string,
  amount: number,
): Promise<unknown> {
  const opStart = Date.now();
  return ensureConnection(async () => {
    const result = await api.setBudgetAmount(month, categoryId, amount);
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error(`[PERF] setBudgetAmount completed in ${Date.now() - opStart}ms`);
    }
    return result;
  }, 'write');
}

/**
 * Set budget carryover for a category in a specific month (ensures API is initialized)
 */
export async function setBudgetCarryover(
  month: string,
  categoryId: string,
  flag: boolean,
): Promise<unknown> {
  const opStart = Date.now();
  return ensureConnection(async () => {
    const result = await api.setBudgetCarryover(month, categoryId, flag);
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error(`[PERF] setBudgetCarryover completed in ${Date.now() - opStart}ms`);
    }
    return result;
  }, 'write');
}

/**
 * Hold budget amount for next month (ensures API is initialized)
 */
export async function holdBudgetForNextMonth(month: string, amount: number): Promise<unknown> {
  return ensureConnection(() => api.holdBudgetForNextMonth(month, amount), 'write');
}

/**
 * Reset budget hold for a specific month (ensures API is initialized)
 */
export async function resetBudgetHold(month: string): Promise<unknown> {
  return ensureConnection(() => api.resetBudgetHold(month), 'write');
}

/**
 * Create a new schedule (ensures API is initialized)
 */
export async function createSchedule(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    if (!extendedApi.createSchedule) {
      throw new Error('createSchedule method is not available in this version of the API');
    }
    return extendedApi.createSchedule(args);
  }, 'write');
}

/**
 * Update a schedule (ensures API is initialized)
 */
export async function updateSchedule(
  id: string,
  args: Record<string, unknown>,
  resetNextDate?: boolean,
): Promise<unknown> {
  return ensureConnection(async () => {
    if (!extendedApi.updateSchedule) {
      throw new Error('updateSchedule method is not available in this version of the API');
    }
    return extendedApi.updateSchedule(id, args, resetNextDate);
  }, 'write');
}

/**
 * Delete a schedule (ensures API is initialized)
 */
export async function deleteSchedule(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    if (!extendedApi.deleteSchedule) {
      throw new Error('deleteSchedule method is not available in this version of the API');
    }
    return extendedApi.deleteSchedule(id);
  }, 'write');
}

/**
 * Merge multiple payees into a target payee (ensures API is initialized)
 */
export async function mergePayees(targetId: string, sourceIds: string[]): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.mergePayees(targetId, sourceIds);
    cacheService.invalidatePattern('payees:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Download a budget (ensures API is initialized)
 * @param budgetId - The budget sync ID
 * @param password - Optional password for end-to-end encrypted budgets
 */
export async function downloadBudget(budgetId: string, password?: string): Promise<void> {
  return ensureConnection(async () => {
    if (password) {
      await api.downloadBudget(budgetId, { password });
    } else {
      await api.downloadBudget(budgetId);
    }

    const activeBudgetId = await loadBudgetByResolvedIdentifier(api, budgetId);
    markConnectionReady(activeBudgetId);
    markSyncSuccess();
    invalidateAllReadState();
  }, 'write');
}

/**
 * Load a budget (ensures API is initialized)
 * Note: This may be the same as downloadBudget in some API versions
 */
export async function loadBudget(budgetId: string): Promise<void> {
  return ensureConnection(async () => {
    if (typeof api.loadBudget === 'function') {
      await api.loadBudget(budgetId);
    } else {
      // Fallback to downloadBudget if loadBudget doesn't exist
      await api.downloadBudget(budgetId);
    }
    markConnectionReady(budgetId);
    markSyncSuccess();
    invalidateAllReadState();
  }, 'write');
}

/**
 * Run bank sync (ensures API is initialized)
 */
export async function runBankSync(accountId?: string): Promise<unknown> {
  return ensureConnection(async () => {
    if (extendedApi.runBankSync) {
      const result = await extendedApi.runBankSync(accountId ? { accountId } : undefined);
      markSyncSuccess();
      invalidateAllReadState();
      return result;
    }
    throw new Error('runBankSync method is not available in this version of the API');
  }, 'write');
}

/**
 * Run import (ensures API is initialized)
 */
export async function runImport(
  budgetName: string,
  callback: () => Promise<void>,
): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.runImport === 'function') {
      const result = await api.runImport(budgetName, callback);
      markSyncSuccess();
      invalidateAllReadState();
      return result;
    }
    throw new Error('runImport method is not available in this version of the API');
  }, 'write');
}

/**
 * Batch budget updates (ensures API is initialized)
 */
export async function batchBudgetUpdates(callback: () => Promise<void>): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.batchBudgetUpdates === 'function') {
      const result = await api.batchBudgetUpdates(callback);
      invalidateAllReadState();
      return result;
    }
    throw new Error('batchBudgetUpdates method is not available in this version of the API');
  }, 'write');
}
