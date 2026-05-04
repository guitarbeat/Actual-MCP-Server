import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enrichTransactionsBatch,
  fetchAllOnBudgetTransactions,
  fetchAllOnBudgetTransactionsParallel,
  fetchAllTransactions,
  fetchTransactionsForAccount,
} from './fetch-transactions.js';

const mockGetTransactions = vi.fn();
const mockGetPayees = vi.fn();
const mockGetCategories = vi.fn();
const mockCacheGetOrFetch = vi.fn();
const mockResolveAccount = vi.fn();

vi.mock('../../core/api/actual-client.js', () => ({
  getTransactions: (...args: unknown[]) => mockGetTransactions(...args),
  getPayees: (...args: unknown[]) => mockGetPayees(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
}));

vi.mock('../cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: (...args: unknown[]) => mockCacheGetOrFetch(...args),
  },
}));

vi.mock('../utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: (...args: unknown[]) => mockResolveAccount(...args),
  },
}));

const makeRawTransaction = (
  id: string,
  accountId: string,
  payeeId?: string,
  categoryId?: string,
) => ({
  id,
  account: accountId,
  date: '2024-06-15',
  amount: -5000,
  payee: payeeId,
  category: categoryId,
  cleared: true,
});

const makeAccount = (id: string, name: string, offbudget = false, closed = false) => ({
  id,
  name,
  balance: 0,
  offbudget,
  closed,
});

describe('fetch-transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPayees.mockResolvedValue([]);
    mockGetCategories.mockResolvedValue([]);
    mockCacheGetOrFetch.mockImplementation(async (_key: string, fn: () => Promise<unknown>) =>
      fn(),
    );
    mockResolveAccount.mockResolvedValue('acc-1');
  });

  describe('enrichTransactionsBatch', () => {
    it('returns empty array for empty input', async () => {
      const result = await enrichTransactionsBatch([]);
      expect(result).toEqual([]);
    });

    it('returns transactions unchanged when no payee or category refs', async () => {
      const txns = [makeRawTransaction('t1', 'acc-1')];
      const result = await enrichTransactionsBatch(txns as never);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });

    it('enriches payee_name from pre-fetched lookups', async () => {
      const lookups = {
        payeesById: { 'payee-1': { id: 'payee-1', name: 'Amazon' } },
        categoriesById: {},
      };
      const txns = [makeRawTransaction('t1', 'acc-1', 'payee-1')];
      const result = await enrichTransactionsBatch(txns as never, lookups as never);
      expect(result[0].payee_name).toBe('Amazon');
    });

    it('enriches category_name from pre-fetched lookups', async () => {
      const lookups = {
        payeesById: {},
        categoriesById: {
          'cat-1': {
            id: 'cat-1',
            name: 'Groceries',
            group_id: 'g1',
            is_income: false,
            hidden: false,
          },
        },
      };
      const txns = [makeRawTransaction('t1', 'acc-1', undefined, 'cat-1')];
      const result = await enrichTransactionsBatch(txns as never, lookups as never);
      expect(result[0].category_name).toBe('Groceries');
    });

    it('fetches payees from cache when lookups not provided', async () => {
      mockCacheGetOrFetch.mockImplementation(async (_key: string, fn: () => Promise<unknown>) => {
        if (String(_key).includes('payees')) {
          return { 'payee-1': { id: 'payee-1', name: 'Google' } };
        }
        return {};
      });
      const txns = [makeRawTransaction('t1', 'acc-1', 'payee-1')];
      const result = await enrichTransactionsBatch(txns as never);
      expect(result[0].payee_name).toBe('Google');
    });
  });

  describe('fetchTransactionsForAccount', () => {
    it('resolves account name to id and calls getTransactions', async () => {
      mockResolveAccount.mockResolvedValue('acc-resolved');
      mockGetTransactions.mockResolvedValue([]);
      await fetchTransactionsForAccount('My Account', '2024-01-01', '2024-06-30');
      expect(mockResolveAccount).toHaveBeenCalledWith('My Account');
      expect(mockGetTransactions).toHaveBeenCalledWith('acc-resolved', '2024-01-01', '2024-06-30');
    });

    it('skips name resolution when accountIdIsResolved is true', async () => {
      mockGetTransactions.mockResolvedValue([]);
      await fetchTransactionsForAccount('acc-direct', '2024-01-01', '2024-06-30', {
        accountIdIsResolved: true,
      });
      expect(mockResolveAccount).not.toHaveBeenCalled();
      expect(mockGetTransactions).toHaveBeenCalledWith('acc-direct', '2024-01-01', '2024-06-30');
    });
  });

  describe('fetchAllOnBudgetTransactionsParallel', () => {
    it('filters out offbudget and closed accounts', async () => {
      const accounts = [
        makeAccount('acc-1', 'Checking'),
        makeAccount('acc-2', 'Savings', true), // offbudget
        makeAccount('acc-3', 'Old', false, true), // closed
      ];
      mockGetTransactions.mockResolvedValue([]);
      const result = await fetchAllOnBudgetTransactionsParallel(
        accounts,
        '2024-01-01',
        '2024-06-30',
      );
      expect(mockGetTransactions).toHaveBeenCalledTimes(1);
      expect(mockGetTransactions).toHaveBeenCalledWith(
        'acc-1',
        expect.any(String),
        expect.any(String),
      );
      expect(result.successfulAccountIds).toEqual(['acc-1']);
    });

    it('returns empty result when no accounts', async () => {
      const result = await fetchAllOnBudgetTransactionsParallel([], '2024-01-01', '2024-06-30');
      expect(result.transactions).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('handles partial failures and collects warnings', async () => {
      const accounts = [makeAccount('acc-1', 'Good'), makeAccount('acc-2', 'Bad')];
      mockGetTransactions
        .mockResolvedValueOnce([makeRawTransaction('t1', 'acc-1')])
        .mockRejectedValueOnce(new Error('fetch failed'));
      const result = await fetchAllOnBudgetTransactionsParallel(
        accounts,
        '2024-01-01',
        '2024-06-30',
      );
      expect(result.transactions).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].accountId).toBe('acc-2');
    });
  });

  describe('fetchAllOnBudgetTransactions', () => {
    it('returns enriched transactions array', async () => {
      const accounts = [makeAccount('acc-1', 'Checking')];
      mockGetTransactions.mockResolvedValue([makeRawTransaction('t1', 'acc-1')]);
      const result = await fetchAllOnBudgetTransactions(accounts, '2024-01-01', '2024-06-30');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchAllTransactions', () => {
    it('includes all accounts (not just on-budget)', async () => {
      const accounts = [
        makeAccount('acc-1', 'Checking'),
        makeAccount('acc-2', 'Savings', true), // offbudget – should be included
      ];
      mockGetTransactions.mockResolvedValue([]);
      await fetchAllTransactions(accounts, '2024-01-01', '2024-06-30');
      expect(mockGetTransactions).toHaveBeenCalledTimes(2);
    });
  });
});
