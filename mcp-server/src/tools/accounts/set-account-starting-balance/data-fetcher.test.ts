import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetAccountStartingBalanceDataFetcher } from './data-fetcher.js';

const mockImportTransactions = vi.fn();
const mockUpdateTransaction = vi.fn();
const mockFetchAllAccounts = vi.fn();
const mockFetchTransactionsForAccount = vi.fn();
const mockResolveAccount = vi.fn();
const mockResolveCategory = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  importTransactions: (...args: unknown[]) => mockImportTransactions(...args),
  updateTransaction: (...args: unknown[]) => mockUpdateTransaction(...args),
}));

vi.mock('../../../core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: () => mockFetchAllAccounts(),
}));

vi.mock('../../../core/data/fetch-transactions.js', () => ({
  fetchTransactionsForAccount: (...args: unknown[]) => mockFetchTransactionsForAccount(...args),
}));

vi.mock('../../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: (...args: unknown[]) => mockResolveAccount(...args),
    resolveCategory: (...args: unknown[]) => mockResolveCategory(...args),
  },
}));

describe('SetAccountStartingBalanceDataFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockResolveAccount.mockResolvedValue('account-1');
    mockResolveCategory.mockResolvedValue('category-starting-balances');
    mockFetchAllAccounts.mockResolvedValue([{ id: 'account-1', name: 'Checking' }]);
  });

  it('creates a starting balance transaction when one does not already exist', async () => {
    mockFetchTransactionsForAccount.mockResolvedValue([
      {
        id: 'txn-1',
        account: 'account-1',
        date: '2024-03-10',
        amount: -2500,
        is_child: false,
        starting_balance_flag: false,
      },
    ]);
    mockImportTransactions.mockResolvedValue({ added: ['start-1'], updated: [] });

    const fetcher = new SetAccountStartingBalanceDataFetcher();
    const plan = await fetcher.buildPlan({
      account: 'Checking',
      amountCents: 12345,
    });
    const result = await fetcher.applyPlan(plan);

    expect(plan.effectiveDate).toBe('2024-03-09');
    expect(mockImportTransactions).toHaveBeenCalledWith(
      'account-1',
      [
        expect.objectContaining({
          date: '2024-03-09',
          amount: 12345,
          category: 'category-starting-balances',
          notes: 'Starting balance',
          cleared: true,
        }),
      ],
      { defaultCleared: true },
    );
    expect(mockUpdateTransaction).toHaveBeenCalledWith('start-1', { starting_balance_flag: true });
    expect(result).toMatchObject({
      action: 'created',
      accountId: 'account-1',
      accountName: 'Checking',
      transactionId: 'start-1',
      warnings: [],
    });
  });

  it('updates the oldest existing starting balance and warns about duplicates', async () => {
    mockFetchTransactionsForAccount.mockResolvedValue([
      {
        id: 'start-oldest',
        account: 'account-1',
        date: '2024-01-01',
        amount: 1000,
        is_child: false,
        notes: 'Original balance',
        starting_balance_flag: true,
      },
      {
        id: 'start-duplicate',
        account: 'account-1',
        date: '2024-01-02',
        amount: 1000,
        is_child: false,
        starting_balance_flag: true,
      },
      {
        id: 'txn-real',
        account: 'account-1',
        date: '2024-02-10',
        amount: -4500,
        is_child: false,
        starting_balance_flag: false,
      },
    ]);

    const fetcher = new SetAccountStartingBalanceDataFetcher();
    const plan = await fetcher.buildPlan({
      account: 'Checking',
      amountCents: 50000,
    });
    const result = await fetcher.applyPlan(plan);

    expect(plan).toMatchObject({
      existingTransactionId: 'start-oldest',
      duplicateTransactionIds: ['start-duplicate'],
      effectiveDate: '2024-02-09',
      notes: 'Original balance',
    });
    expect(mockUpdateTransaction).toHaveBeenCalledWith(
      'start-oldest',
      expect.objectContaining({
        amount: 50000,
        category: 'category-starting-balances',
        date: '2024-02-09',
        notes: 'Original balance',
        starting_balance_flag: true,
      }),
    );
    expect(result.warnings[0]).toContain('Multiple starting balance transactions already exist');
    expect(result.duplicateTransactionIds).toEqual(['start-duplicate']);
  });

  it('fails when the account cannot be resolved', async () => {
    mockResolveAccount.mockRejectedValue(new Error("Account 'Missing' not found"));

    const fetcher = new SetAccountStartingBalanceDataFetcher();

    await expect(
      fetcher.buildPlan({
        account: 'Missing',
        amountCents: 1000,
      }),
    ).rejects.toThrow("Account 'Missing' not found");
  });
});
