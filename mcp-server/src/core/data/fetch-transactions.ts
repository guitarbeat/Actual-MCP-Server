import type { TransactionEntity } from '@actual-app/api/@types/loot-core/src/types/models/transaction.js';
import { getTransactions } from '../../core/api/actual-client.js';
import type { Account, Category, Payee, Transaction } from '../types/domain.js';
import { mapSettledWithConcurrency } from '../utils/concurrency.js';
import { nameResolver } from '../utils/name-resolver.js';
import type { AccountDataWarning } from '../utils/partial-results.js';
import { fetchAllCategoriesMap } from './fetch-categories.js';
import { fetchAllPayeesMap } from './fetch-payees.js';

interface TransactionLookupOptions {
  includePayees: boolean;
  includeCategories: boolean;
}

export interface TransactionLookups {
  payeesById: Record<string, Payee>;
  categoriesById: Record<string, Category>;
}

export interface TransactionFetchResult {
  transactions: Transaction[];
  successfulAccountIds: string[];
  warnings: AccountDataWarning[];
}

const TRANSACTION_FETCH_CONCURRENCY = 4;

async function _buildTransactionLookups(
  options: TransactionLookupOptions,
): Promise<TransactionLookups> {
  // Optimization: Use cached maps to avoid rebuilding them on every call
  // This reduces CPU usage and memory allocations when enriching large batches of transactions
  const [payeesById, categoriesById] = await Promise.all([
    options.includePayees ? fetchAllPayeesMap() : Promise.resolve<Record<string, Payee>>({}),
    options.includeCategories
      ? fetchAllCategoriesMap()
      : Promise.resolve<Record<string, Category>>({}),
  ]);

  return { payeesById, categoriesById };
}

/**
 * Enrich transactions with payee and category names using optional pre-fetched lookups.
 * If lookups are not provided, they will be fetched only if needed.
 *
 * @param transactions - Array of transactions to enrich
 * @param lookups - Optional pre-fetched lookup tables for payees and categories
 * @returns Array of enriched transactions with payee_name and category_name populated
 */
async function _enrichTransactions(
  transactions: TransactionEntity[],
  lookups?: TransactionLookups,
): Promise<Transaction[]> {
  if (transactions.length === 0) {
    return transactions;
  }

  // # Reason: Only fetch lookup tables when transactions are missing names to avoid redundant API calls.
  const needsPayees = transactions.some((transaction) => Boolean(transaction.payee));
  const needsCategories = transactions.some((transaction) => Boolean(transaction.category));

  if (!needsPayees && !needsCategories) {
    return transactions;
  }

  // # Reason: Use pre-fetched lookups if provided, otherwise fetch them
  const { payeesById, categoriesById } =
    lookups ||
    (await _buildTransactionLookups({
      includePayees: needsPayees,
      includeCategories: needsCategories,
    }));

  return transactions.map((transaction: TransactionEntity) => {
    const payeeName =
      needsPayees && transaction.payee ? payeesById[transaction.payee]?.name : undefined;
    const categoryName =
      needsCategories && transaction.category
        ? categoriesById[transaction.category]?.name
        : undefined;

    const enriched: Transaction = { ...transaction };

    if (payeeName !== undefined) {
      enriched.payee_name = payeeName;
    }

    if (categoryName !== undefined) {
      enriched.category_name = categoryName;
    }

    return enriched;
  });
}

/**
 * Enrich a batch of transactions with payee and category names by reusing lookup tables.
 * This function fetches lookup tables once and reuses them for all transactions,
 * making it efficient for large batches.
 *
 * @param transactions - Array of transactions to enrich
 * @param lookups - Optional pre-fetched lookup tables. If not provided, they will be fetched once
 * @returns Array of enriched transactions with payee_name and category_name populated
 */
export async function enrichTransactionsBatch(
  transactions: TransactionEntity[],
  lookups?: TransactionLookups,
): Promise<Transaction[]> {
  if (transactions.length === 0) {
    return transactions;
  }

  // # Reason: Determine what lookups are needed based on transaction data
  const needsPayees = transactions.some((transaction) => Boolean(transaction.payee));
  const needsCategories = transactions.some((transaction) => Boolean(transaction.category));

  if (!needsPayees && !needsCategories) {
    return transactions;
  }

  // # Reason: Fetch lookups once if not provided, then reuse for all transactions
  const actualLookups =
    lookups ||
    (await _buildTransactionLookups({
      includePayees: needsPayees,
      includeCategories: needsCategories,
    }));

  return _enrichTransactions(transactions, actualLookups);
}

interface FetchTransactionsOptions {
  accountIdIsResolved?: boolean;
}

export async function fetchTransactionsForAccount(
  accountIdOrName: string,
  start: string,
  end: string,
  options: FetchTransactionsOptions = {},
): Promise<Transaction[]> {
  const accountId = options.accountIdIsResolved
    ? accountIdOrName
    : await nameResolver.resolveAccount(accountIdOrName);
  const transactions = await getTransactions(accountId, start, end);
  return _enrichTransactions(transactions);
}

/**
 * Fetch transactions for multiple accounts in parallel using Promise.all().
 * Handles partial failures by continuing with successful accounts and returning
 * partial results with error details.
 *
 * @param accounts - Array of accounts to fetch transactions from
 * @param start - Start date in YYYY-MM-DD format
 * @param end - End date in YYYY-MM-DD format
 * @returns Object containing transactions array and optional errors array
 */
async function fetchTransactionsAcrossAccounts(
  accounts: Account[],
  start: string,
  end: string,
): Promise<{
  transactions: TransactionEntity[];
  successfulAccountIds: string[];
  warnings: AccountDataWarning[];
}> {
  if (accounts.length === 0) {
    return {
      transactions: [],
      successfulAccountIds: [],
      warnings: [],
    };
  }

  const fetchStart = Date.now();
  const results = await mapSettledWithConcurrency(
    accounts,
    async (account) => ({
      account,
      transactions: await getTransactions(account.id, start, end),
    }),
    TRANSACTION_FETCH_CONCURRENCY,
  );

  const transactions: TransactionEntity[] = [];
  const successfulAccountIds: string[] = [];
  const warnings: AccountDataWarning[] = [];

  results.forEach((result, index) => {
    const account = accounts[index];
    if (result.status === 'fulfilled') {
      transactions.push(...result.value.transactions);
      successfulAccountIds.push(account.id);
      return;
    }

    const error =
      result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'unknown');
    warnings.push({
      accountId: account.id,
      accountName: account.name,
      operation: 'transactions',
      error,
    });
  });

  if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
    console.error(
      `[PERF] Transactions fetched for ${successfulAccountIds.length}/${accounts.length} accounts in ${Date.now() - fetchStart}ms`,
    );
  }

  if (warnings.length > 0) {
    console.error('[TRANSACTIONS] Partial failures while fetching account transactions:', warnings);
  }

  return {
    transactions,
    successfulAccountIds,
    warnings,
  };
}

export async function fetchAllOnBudgetTransactionsParallel(
  accounts: Account[],
  start: string,
  end: string,
): Promise<{
  transactions: TransactionEntity[];
  successfulAccountIds: string[];
  warnings: AccountDataWarning[];
}> {
  const onBudgetAccounts = accounts.filter((a) => !a.offbudget && !a.closed);
  return fetchTransactionsAcrossAccounts(onBudgetAccounts, start, end);
}

export async function fetchAllOnBudgetTransactionsWithMetadata(
  accounts: Account[],
  start: string,
  end: string,
): Promise<TransactionFetchResult> {
  const result = await fetchAllOnBudgetTransactionsParallel(accounts, start, end);

  return {
    transactions: await enrichTransactionsBatch(result.transactions),
    successfulAccountIds: result.successfulAccountIds,
    warnings: result.warnings,
  };
}

export async function fetchAllOnBudgetTransactions(
  accounts: Account[],
  start: string,
  end: string,
): Promise<Transaction[]> {
  const result = await fetchAllOnBudgetTransactionsWithMetadata(accounts, start, end);
  return result.transactions;
}

export async function fetchAllTransactionsWithMetadata(
  accounts: Account[],
  start: string,
  end: string,
): Promise<TransactionFetchResult> {
  const result = await fetchTransactionsAcrossAccounts(accounts, start, end);

  return {
    transactions: await enrichTransactionsBatch(result.transactions),
    successfulAccountIds: result.successfulAccountIds,
    warnings: result.warnings,
  };
}

export async function fetchAllTransactions(
  accounts: Account[],
  start: string,
  end: string,
): Promise<Transaction[]> {
  const result = await fetchAllTransactionsWithMetadata(accounts, start, end);
  return result.transactions;
}
