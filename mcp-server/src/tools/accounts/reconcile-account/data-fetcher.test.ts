import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReconcileAccountDataFetcher } from './data-fetcher.js';

const mockGetAccountBalance = vi.fn();
const mockUpdateTransaction = vi.fn();
const mockFetchAllAccounts = vi.fn();
const mockFetchTransactionsForAccount = vi.fn();
const mockResolveAccount = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  getAccountBalance: (...args: unknown[]) => mockGetAccountBalance(...args),
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
  },
}));

describe('ReconcileAccountDataFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockResolveAccount.mockResolvedValue('account-1');
    mockFetchAllAccounts.mockResolvedValue([{ id: 'account-1', name: 'Checking' }]);
  });

  it('builds a balanced reconciliation snapshot and identifies clearable transactions', async () => {
    mockFetchTransactionsForAccount.mockResolvedValue([
      {
        id: 'start-balance',
        account: 'account-1',
        date: '2025-01-01',
        amount: 100000,
        cleared: true,
        starting_balance_flag: true,
      },
      {
        id: 'cleared-1',
        account: 'account-1',
        date: '2025-01-05',
        amount: -15000,
        cleared: true,
      },
      {
        id: 'uncleared-1',
        account: 'account-1',
        date: '2025-01-10',
        amount: -5000,
        cleared: false,
        payee_name: 'Electric Co',
      },
      {
        id: 'future-1',
        account: 'account-1',
        date: '2025-02-01',
        amount: -2000,
        cleared: false,
      },
    ]);
    mockGetAccountBalance.mockResolvedValue(80000);

    const fetcher = new ReconcileAccountDataFetcher();
    const snapshot = await fetcher.fetchSnapshot('Checking', '2025-01-31', 80000);

    expect(snapshot).toMatchObject({
      accountId: 'account-1',
      accountName: 'Checking',
      differenceCents: 0,
      clearedBalanceCents: 85000,
      unclearedBalanceCents: -5000,
      futureTransactionsIgnored: 1,
    });
    expect(snapshot.eligibleTransactions.map((transaction) => transaction.id)).toEqual([
      'uncleared-1',
    ]);
  });

  it('returns a non-zero difference when the statement balance does not match', async () => {
    mockFetchTransactionsForAccount.mockResolvedValue([
      {
        id: 'cleared-1',
        account: 'account-1',
        date: '2025-01-05',
        amount: -15000,
        cleared: true,
      },
      {
        id: 'uncleared-1',
        account: 'account-1',
        date: '2025-01-10',
        amount: -5000,
        cleared: false,
      },
    ]);
    mockGetAccountBalance.mockResolvedValue(18000);

    const fetcher = new ReconcileAccountDataFetcher();
    const snapshot = await fetcher.fetchSnapshot('Checking', '2025-01-31', 20000);

    expect(snapshot.differenceCents).toBe(2000);
    expect(snapshot.unclearedTransactions).toHaveLength(1);
    expect(snapshot.eligibleTransactions).toHaveLength(1);
  });

  it('counts only successfully cleared transactions', async () => {
    mockUpdateTransaction
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('write failed'));

    const fetcher = new ReconcileAccountDataFetcher();
    const clearedCount = await fetcher.clearTransactions([
      {
        id: 'txn-1',
        account: 'account-1',
        date: '2025-01-01',
        amount: -1000,
      },
      {
        id: 'txn-2',
        account: 'account-1',
        date: '2025-01-02',
        amount: -2000,
      },
    ]);

    expect(clearedCount).toBe(1);
    expect(mockUpdateTransaction).toHaveBeenCalledTimes(2);
  });
});
