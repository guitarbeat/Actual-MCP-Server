import type { TransactionEntity } from '@actual-app/api/@types/loot-core/src/types/models/transaction.js';
import { getTransactions } from '../../core/api/actual-client.js';
import { GroupAggregator } from '../aggregation/group-by.js';
import type { Account, Category, Payee, Transaction } from '../types/domain.js';
import { nameResolver } from '../utils/name-resolver.js';
import { fetchAllCategories } from './fetch-categories.js';
import { fetchAllPayees } from './fetch-payees.js';

const groupAggregator = new GroupAggregator();

interface TransactionLookupOptions {
  includePayees: boolean;
  includeCategories: boolean;
}

export interface TransactionLookups {
  payeesById: Record<string, Payee>;
  categoriesById: Record<string, Category>;
}

async function _buildTransactionLookups(options: TransactionLookupOptions): Promise<TransactionLookups> {
  const [payees, categories] = await Promise.all([
    options.includePayees ? fetchAllPayees() : Promise.resolve<Payee[]>([]),
    options.includeCategories ? fetchAllCategories() : Promise.resolve<Category[]>([]),
  ]);

  const payeesById: Record<string, Payee> = options.includePayees ? groupAggregator.byId(payees) : {};
  const categoriesById: Record<string, Category> = options.includeCategories ? groupAggregator.byId(categories) : {};

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
  lookups?: TransactionLookups
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
    const payeeName = needsPayees && transaction.payee ? payeesById[transaction.payee]?.name : undefined;
    const categoryName =
      needsCategories && transaction.category ? categoriesById[transaction.category]?.name : undefined;

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
  lookups?: TransactionLookups
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
  options: FetchTransactionsOptions = {}
): Promise<Transaction[]> {
  const accountId = options.accountIdIsResolved ? accountIdOrName : await nameResolver.resolveAccount(accountIdOrName);
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
export async function fetchAllOnBudgetTransactionsParallel(
  accounts: Account[],
  start: string,
  end: string
): Promise<{
  transactions: TransactionEntity[];
  errors?: Array<{ accountId: string; accountName: string; error: string }>;
}> {
  const onBudgetAccounts = accounts.filter((a) => !a.offbudget && !a.closed);

  if (onBudgetAccounts.length === 0) {
    return { transactions: [] };
  }

  // # Reason: Use Promise.allSettled to handle partial failures gracefully
  const results = await Promise.allSettled(
    onBudgetAccounts.map((account) =>
      getTransactions(account.id, start, end).then((txs) => ({
        account,
        transactions: txs,
      }))
    )
  );

  const transactions: TransactionEntity[] = [];
  const errors: Array<{
    accountId: string;
    accountName: string;
    error: string;
  }> = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      transactions.push(...result.value.transactions);
    } else {
      // Extract account info from the error if possible
      const accountInfo = onBudgetAccounts[results.indexOf(result)];
      errors.push({
        accountId: accountInfo.id,
        accountName: accountInfo.name,
        error: result.reason?.message || String(result.reason),
      });
    }
  }

  return errors.length > 0 ? { transactions, errors } : { transactions };
}

export async function fetchAllOnBudgetTransactions(
  accounts: Account[],
  start: string,
  end: string
): Promise<Transaction[]> {
  const result = await fetchAllOnBudgetTransactionsParallel(accounts, start, end);

  // # Reason: Log errors but don't fail the entire operation for partial failures
  if (result.errors && result.errors.length > 0) {
    console.error('Errors fetching transactions for some accounts:', result.errors);
  }

  // # Reason: Use batch enrichment to fetch lookups only once for all transactions
  return enrichTransactionsBatch(result.transactions);
}

export async function fetchAllTransactions(accounts: Account[], start: string, end: string): Promise<Transaction[]> {
  if (accounts.length === 0) {
    return [];
  }

  // # Reason: Use Promise.allSettled to handle partial failures gracefully
  const results = await Promise.allSettled(
    accounts.map((account) =>
      getTransactions(account.id, start, end).then((txs) => ({
        account,
        transactions: txs,
      }))
    )
  );

  const transactions: TransactionEntity[] = [];
  const errors: Array<{
    accountId: string;
    accountName: string;
    error: string;
  }> = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      transactions.push(...result.value.transactions);
    } else {
      // Extract account info from the error if possible
      const accountInfo = accounts[results.indexOf(result)];
      errors.push({
        accountId: accountInfo.id,
        accountName: accountInfo.name,
        error: result.reason?.message || String(result.reason),
      });
    }
  }

  // # Reason: Log errors but don't fail the entire operation for partial failures
  if (errors.length > 0) {
    console.error('Errors fetching transactions for some accounts:', errors);
  }

  // # Reason: Use batch enrichment to fetch lookups only once for all transactions
  return enrichTransactionsBatch(transactions);
}
