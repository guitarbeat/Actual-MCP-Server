import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Account } from '../types/domain.js';

vi.mock('../../actual-api.js', () => ({
  getTransactions: vi.fn(),
}));

vi.mock('./fetch-payees.js', () => ({
  fetchAllPayees: vi.fn(),
}));

vi.mock('./fetch-categories.js', () => ({
  fetchAllCategories: vi.fn(),
}));

vi.mock('../utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: vi.fn(),
  },
}));

import {
  fetchTransactionsForAccount,
  fetchAllOnBudgetTransactions,
  fetchAllTransactions,
  fetchAllOnBudgetTransactionsParallel,
  enrichTransactionsBatch,
} from './fetch-transactions.js';
import { getTransactions } from '../../actual-api.js';
import { fetchAllPayees } from './fetch-payees.js';
import { fetchAllCategories } from './fetch-categories.js';
import { nameResolver } from '../utils/name-resolver.js';

describe('fetchTransactionsForAccount', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(nameResolver.resolveAccount).mockImplementation(async (value: string) => value);
  });

  it('should return transactions for specific account with populated names', async () => {
    const mockTransactions = [
      {
        id: '1',
        account: 'acc1',
        date: '2023-01-01',
        amount: -100,
        payee: 'p1',
        category: 'c1',
      },
      {
        id: '2',
        account: 'acc1',
        date: '2023-01-02',
        amount: -50,
        payee: 'p2',
        category: 'c2',
      },
    ];
    vi.mocked(getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(fetchAllPayees).mockResolvedValue([
      { id: 'p1', name: 'Store' },
      { id: 'p2', name: 'Gas Station' },
    ]);
    vi.mocked(fetchAllCategories).mockResolvedValue([
      { id: 'c1', name: 'Groceries', group_id: 'g1' },
      { id: 'c2', name: 'Fuel', group_id: 'g2' },
    ]);

    vi.mocked(nameResolver.resolveAccount).mockResolvedValue('resolved-acc1');

    const result = await fetchTransactionsForAccount('acc1', '2023-01-01', '2023-01-31');

    expect(result).toEqual([
      {
        ...mockTransactions[0],
        payee_name: 'Store',
        category_name: 'Groceries',
      },
      {
        ...mockTransactions[1],
        payee_name: 'Gas Station',
        category_name: 'Fuel',
      },
    ]);
    expect(nameResolver.resolveAccount).toHaveBeenCalledWith('acc1');
    expect(getTransactions).toHaveBeenCalledWith('resolved-acc1', '2023-01-01', '2023-01-31');
    expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    expect(fetchAllCategories).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors', async () => {
    vi.mocked(getTransactions).mockRejectedValue(new Error('Transactions API Error'));

    await expect(fetchTransactionsForAccount('acc1', '2023-01-01', '2023-01-31')).rejects.toThrow(
      'Transactions API Error'
    );
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should preserve transfer identifiers from the API response', async () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        account: 'acc1',
        date: '2023-01-03',
        amount: -25,
        transfer_id: 'transfer-link',
      },
    ];

    vi.mocked(getTransactions).mockResolvedValue(mockTransactions);

    const result = await fetchTransactionsForAccount('acc1', '2023-01-01', '2023-01-31');

    expect(result).toEqual(mockTransactions);
    expect(result[0].transfer_id).toBe('transfer-link');
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should handle empty response without requesting additional lookups', async () => {
    vi.mocked(getTransactions).mockResolvedValue([]);

    const result = await fetchTransactionsForAccount('acc1', '2023-01-01', '2023-01-31');

    expect(result).toEqual([]);
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('resolves account names before fetching transactions', async () => {
    vi.mocked(nameResolver.resolveAccount).mockResolvedValue('acc-from-name');
    vi.mocked(getTransactions).mockResolvedValue([]);

    await fetchTransactionsForAccount('Checking', '2023-01-01', '2023-01-31');

    expect(nameResolver.resolveAccount).toHaveBeenCalledWith('Checking');
    expect(getTransactions).toHaveBeenCalledWith('acc-from-name', '2023-01-01', '2023-01-31');
  });
});

describe('fetchAllOnBudgetTransactions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return transactions for all on-budget accounts', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Checking', offbudget: false, closed: false },
      { id: 'acc2', name: 'Savings', offbudget: false, closed: false },
      { id: 'acc3', name: 'Credit Card', offbudget: true, closed: false }, // Should be excluded
      { id: 'acc4', name: 'Old Account', offbudget: false, closed: true }, // Should be excluded
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100 }];
    const mockTransactions2 = [{ id: '2', account: 'acc2', date: '2023-01-01', amount: -50 }];

    vi.mocked(getTransactions).mockResolvedValueOnce(mockTransactions1).mockResolvedValueOnce(mockTransactions2);
    vi.mocked(fetchAllPayees).mockResolvedValue([]);
    vi.mocked(fetchAllCategories).mockResolvedValue([]);

    const result = await fetchAllOnBudgetTransactions(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([...mockTransactions1, ...mockTransactions2]);
    expect(getTransactions).toHaveBeenCalledTimes(2);
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(getTransactions).toHaveBeenCalledWith('acc2', '2023-01-01', '2023-01-31');
  });

  it('should handle empty accounts array', async () => {
    const result = await fetchAllOnBudgetTransactions([], '2023-01-01', '2023-01-31');

    expect(result).toEqual([]);
    expect(getTransactions).not.toHaveBeenCalled();
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should handle accounts with no on-budget accounts', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Credit Card', offbudget: true, closed: false },
      { id: 'acc2', name: 'Old Account', offbudget: false, closed: true },
    ];

    const result = await fetchAllOnBudgetTransactions(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([]);
    expect(getTransactions).not.toHaveBeenCalled();
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should handle API errors for individual accounts and return empty results', async () => {
    const mockAccounts: Account[] = [{ id: 'acc1', name: 'Checking', offbudget: false, closed: false }];

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(getTransactions).mockRejectedValue(new Error('Transaction API Error'));

    const result = await fetchAllOnBudgetTransactions(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Errors fetching transactions for some accounts:',
      expect.arrayContaining([
        expect.objectContaining({
          accountId: 'acc1',
          accountName: 'Checking',
          error: 'Transaction API Error',
        }),
      ])
    );
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should request lookups once when enrichment is needed', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Checking', offbudget: false, closed: false },
      { id: 'acc2', name: 'Savings', offbudget: false, closed: false },
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100, payee: 'p1' }];
    const mockTransactions2 = [{ id: '2', account: 'acc2', date: '2023-01-01', amount: -50, category: 'c1' }];

    vi.mocked(getTransactions).mockResolvedValueOnce(mockTransactions1).mockResolvedValueOnce(mockTransactions2);
    vi.mocked(fetchAllPayees).mockResolvedValue([{ id: 'p1', name: 'Store' }]);
    vi.mocked(fetchAllCategories).mockResolvedValue([{ id: 'c1', name: 'Fuel', group_id: 'g1' }]);

    const result = await fetchAllOnBudgetTransactions(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([
      { ...mockTransactions1[0], payee_name: 'Store' },
      { ...mockTransactions2[0], category_name: 'Fuel' },
    ]);
    expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    expect(fetchAllCategories).toHaveBeenCalledTimes(1);
  });
});

describe('fetchAllOnBudgetTransactionsParallel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch transactions from multiple accounts in parallel', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Checking', offbudget: false, closed: false },
      { id: 'acc2', name: 'Savings', offbudget: false, closed: false },
      { id: 'acc3', name: 'Investment', offbudget: false, closed: false },
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100 }];
    const mockTransactions2 = [{ id: '2', account: 'acc2', date: '2023-01-02', amount: -50 }];
    const mockTransactions3 = [{ id: '3', account: 'acc3', date: '2023-01-03', amount: -75 }];

    vi.mocked(getTransactions)
      .mockResolvedValueOnce(mockTransactions1)
      .mockResolvedValueOnce(mockTransactions2)
      .mockResolvedValueOnce(mockTransactions3);

    const result = await fetchAllOnBudgetTransactionsParallel(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result.transactions).toEqual([...mockTransactions1, ...mockTransactions2, ...mockTransactions3]);
    expect(result.errors).toBeUndefined();
    expect(getTransactions).toHaveBeenCalledTimes(3);
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(getTransactions).toHaveBeenCalledWith('acc2', '2023-01-01', '2023-01-31');
    expect(getTransactions).toHaveBeenCalledWith('acc3', '2023-01-01', '2023-01-31');
  });

  it('should handle partial failures and return successful results with errors', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Checking', offbudget: false, closed: false },
      { id: 'acc2', name: 'Savings', offbudget: false, closed: false },
      { id: 'acc3', name: 'Investment', offbudget: false, closed: false },
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100 }];
    const mockTransactions3 = [{ id: '3', account: 'acc3', date: '2023-01-03', amount: -75 }];

    vi.mocked(getTransactions)
      .mockResolvedValueOnce(mockTransactions1)
      .mockRejectedValueOnce(new Error('Account sync failed'))
      .mockResolvedValueOnce(mockTransactions3);

    const result = await fetchAllOnBudgetTransactionsParallel(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result.transactions).toEqual([...mockTransactions1, ...mockTransactions3]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toEqual({
      accountId: 'acc2',
      accountName: 'Savings',
      error: 'Account sync failed',
    });
    expect(getTransactions).toHaveBeenCalledTimes(3);
  });

  it('should return empty transactions array when no on-budget accounts exist', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Credit Card', offbudget: true, closed: false },
      { id: 'acc2', name: 'Old Account', offbudget: false, closed: true },
    ];

    const result = await fetchAllOnBudgetTransactionsParallel(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result.transactions).toEqual([]);
    expect(result.errors).toBeUndefined();
    expect(getTransactions).not.toHaveBeenCalled();
  });

  it('should handle single account scenario', async () => {
    const mockAccounts: Account[] = [{ id: 'acc1', name: 'Checking', offbudget: false, closed: false }];

    const mockTransactions = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100 }];

    vi.mocked(getTransactions).mockResolvedValueOnce(mockTransactions);

    const result = await fetchAllOnBudgetTransactionsParallel(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result.transactions).toEqual(mockTransactions);
    expect(result.errors).toBeUndefined();
    expect(getTransactions).toHaveBeenCalledTimes(1);
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
  });

  it('should filter out offbudget and closed accounts before fetching', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Checking', offbudget: false, closed: false },
      { id: 'acc2', name: 'Credit Card', offbudget: true, closed: false },
      { id: 'acc3', name: 'Old Savings', offbudget: false, closed: true },
      { id: 'acc4', name: 'Investment', offbudget: false, closed: false },
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100 }];
    const mockTransactions4 = [{ id: '4', account: 'acc4', date: '2023-01-04', amount: -200 }];

    vi.mocked(getTransactions).mockResolvedValueOnce(mockTransactions1).mockResolvedValueOnce(mockTransactions4);

    const result = await fetchAllOnBudgetTransactionsParallel(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result.transactions).toEqual([...mockTransactions1, ...mockTransactions4]);
    expect(result.errors).toBeUndefined();
    expect(getTransactions).toHaveBeenCalledTimes(2);
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(getTransactions).toHaveBeenCalledWith('acc4', '2023-01-01', '2023-01-31');
  });
});

describe('fetchAllTransactions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return transactions for all accounts with enrichment using parallel fetching', async () => {
    const accounts: Account[] = [
      { id: 'acc1', name: 'Checking' },
      { id: 'acc2', name: 'Savings' },
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100, payee: 'p1' }];
    const mockTransactions2 = [{ id: '2', account: 'acc2', date: '2023-01-01', amount: -50, category: 'c1' }];

    vi.mocked(getTransactions).mockResolvedValueOnce(mockTransactions1).mockResolvedValueOnce(mockTransactions2);
    vi.mocked(fetchAllPayees).mockResolvedValue([{ id: 'p1', name: 'Store' }]);
    vi.mocked(fetchAllCategories).mockResolvedValue([{ id: 'c1', name: 'Fuel', group_id: 'g1' }]);

    const result = await fetchAllTransactions(accounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([
      { ...mockTransactions1[0], payee_name: 'Store' },
      { ...mockTransactions2[0], category_name: 'Fuel' },
    ]);
    expect(getTransactions).toHaveBeenCalledTimes(2);
    expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    expect(fetchAllCategories).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no accounts are provided', async () => {
    const result = await fetchAllTransactions([], '2023-01-01', '2023-01-31');

    expect(result).toEqual([]);
    expect(getTransactions).not.toHaveBeenCalled();
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should handle partial failures and continue with successful accounts', async () => {
    const accounts: Account[] = [
      { id: 'acc1', name: 'Checking' },
      { id: 'acc2', name: 'Savings' },
      { id: 'acc3', name: 'Investment' },
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100 }];
    const mockTransactions3 = [{ id: '3', account: 'acc3', date: '2023-01-03', amount: -75 }];

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(getTransactions)
      .mockResolvedValueOnce(mockTransactions1)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockTransactions3);

    const result = await fetchAllTransactions(accounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([...mockTransactions1, ...mockTransactions3]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Errors fetching transactions for some accounts:',
      expect.arrayContaining([
        expect.objectContaining({
          accountId: 'acc2',
          accountName: 'Savings',
          error: 'Network error',
        }),
      ])
    );
    expect(getTransactions).toHaveBeenCalledTimes(3);

    consoleErrorSpy.mockRestore();
  });
});

describe('enrichTransactionsBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should enrich transactions with pre-fetched lookups without additional API calls', async () => {
    const mockTransactions = [
      { id: '1', account: 'acc1', date: '2023-01-01', amount: -100, payee: 'p1', category: 'c1' },
      { id: '2', account: 'acc1', date: '2023-01-02', amount: -50, payee: 'p2', category: 'c2' },
    ];

    const preFetchedLookups = {
      payeesById: {
        p1: { id: 'p1', name: 'Store' },
        p2: { id: 'p2', name: 'Gas Station' },
      },
      categoriesById: {
        c1: { id: 'c1', name: 'Groceries', group_id: 'g1' },
        c2: { id: 'c2', name: 'Fuel', group_id: 'g2' },
      },
    };

    const result = await enrichTransactionsBatch(mockTransactions, preFetchedLookups);

    expect(result).toEqual([
      { ...mockTransactions[0], payee_name: 'Store', category_name: 'Groceries' },
      { ...mockTransactions[1], payee_name: 'Gas Station', category_name: 'Fuel' },
    ]);
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should skip fetching lookups when transactions do not need enrichment', async () => {
    const mockTransactions = [
      { id: '1', account: 'acc1', date: '2023-01-01', amount: -100 },
      { id: '2', account: 'acc1', date: '2023-01-02', amount: -50 },
    ];

    const result = await enrichTransactionsBatch(mockTransactions);

    expect(result).toEqual(mockTransactions);
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should handle batch enrichment with 1000+ transactions efficiently', async () => {
    // # Reason: Generate a large batch of transactions to test performance
    const mockTransactions = Array.from({ length: 1500 }, (_, i) => ({
      id: `tx-${i}`,
      account: 'acc1',
      date: '2023-01-01',
      amount: -100,
      payee: `p${i % 10}`,
      category: `c${i % 5}`,
    }));

    const mockPayees = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      name: `Payee ${i}`,
    }));

    const mockCategories = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      name: `Category ${i}`,
      group_id: `g${i}`,
    }));

    vi.mocked(fetchAllPayees).mockResolvedValue(mockPayees);
    vi.mocked(fetchAllCategories).mockResolvedValue(mockCategories);

    const startTime = Date.now();
    const result = await enrichTransactionsBatch(mockTransactions);
    const duration = Date.now() - startTime;

    expect(result).toHaveLength(1500);
    expect(result[0]).toHaveProperty('payee_name', 'Payee 0');
    expect(result[0]).toHaveProperty('category_name', 'Category 0');
    expect(result[999]).toHaveProperty('payee_name', 'Payee 9');
    expect(result[999]).toHaveProperty('category_name', 'Category 4');
    expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    expect(fetchAllCategories).toHaveBeenCalledTimes(1);

    // # Reason: Verify enrichment completes in reasonable time (should be well under 100ms)
    expect(duration).toBeLessThan(1000);
  });

  it('should fetch lookups once when not provided', async () => {
    const mockTransactions = [
      { id: '1', account: 'acc1', date: '2023-01-01', amount: -100, payee: 'p1' },
      { id: '2', account: 'acc1', date: '2023-01-02', amount: -50, category: 'c1' },
    ];

    vi.mocked(fetchAllPayees).mockResolvedValue([{ id: 'p1', name: 'Store' }]);
    vi.mocked(fetchAllCategories).mockResolvedValue([{ id: 'c1', name: 'Groceries', group_id: 'g1' }]);

    const result = await enrichTransactionsBatch(mockTransactions);

    expect(result).toEqual([
      { ...mockTransactions[0], payee_name: 'Store' },
      { ...mockTransactions[1], category_name: 'Groceries' },
    ]);
    expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    expect(fetchAllCategories).toHaveBeenCalledTimes(1);
  });

  it('should handle empty transactions array', async () => {
    const result = await enrichTransactionsBatch([]);

    expect(result).toEqual([]);
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should only fetch payees when transactions have payee IDs', async () => {
    const mockTransactions = [
      { id: '1', account: 'acc1', date: '2023-01-01', amount: -100, payee: 'p1' },
      { id: '2', account: 'acc1', date: '2023-01-02', amount: -50, payee: 'p2' },
    ];

    vi.mocked(fetchAllPayees).mockResolvedValue([
      { id: 'p1', name: 'Store' },
      { id: 'p2', name: 'Gas Station' },
    ]);
    vi.mocked(fetchAllCategories).mockResolvedValue([]);

    const result = await enrichTransactionsBatch(mockTransactions);

    expect(result).toEqual([
      { ...mockTransactions[0], payee_name: 'Store' },
      { ...mockTransactions[1], payee_name: 'Gas Station' },
    ]);
    expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should only fetch categories when transactions have category IDs', async () => {
    const mockTransactions = [
      { id: '1', account: 'acc1', date: '2023-01-01', amount: -100, category: 'c1' },
      { id: '2', account: 'acc1', date: '2023-01-02', amount: -50, category: 'c2' },
    ];

    vi.mocked(fetchAllPayees).mockResolvedValue([]);
    vi.mocked(fetchAllCategories).mockResolvedValue([
      { id: 'c1', name: 'Groceries', group_id: 'g1' },
      { id: 'c2', name: 'Fuel', group_id: 'g2' },
    ]);

    const result = await enrichTransactionsBatch(mockTransactions);

    expect(result).toEqual([
      { ...mockTransactions[0], category_name: 'Groceries' },
      { ...mockTransactions[1], category_name: 'Fuel' },
    ]);
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).toHaveBeenCalledTimes(1);
  });
});
