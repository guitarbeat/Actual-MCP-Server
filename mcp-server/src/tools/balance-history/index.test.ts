import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const { mockFetchAll } = vi.hoisted(() => ({
  mockFetchAll: vi.fn(),
}));

vi.mock('./data-fetcher.js', () => ({
  BalanceHistoryDataFetcher: vi.fn().mockImplementation(() => ({
    fetchAll: mockFetchAll,
  })),
}));

const SAMPLE_ACCOUNT = {
  id: 'acc-1',
  name: 'Checking',
  offbudget: false,
  closed: false,
  balance: 100000,
};

const SAMPLE_TRANSACTIONS = [
  {
    id: 'tx-1',
    account: 'acc-1',
    date: '2024-01-15',
    amount: -5000,
    category: 'cat-1',
    payee: 'payee-1',
    notes: null,
    cleared: true,
    reconciled: false,
    transfer_id: null,
    subtransactions: [],
  },
];

describe('balance-history handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAll.mockResolvedValue({
      account: SAMPLE_ACCOUNT,
      accounts: [SAMPLE_ACCOUNT],
      transactions: SAMPLE_TRANSACTIONS,
      warnings: [],
    });
  });

  it('returns a balance history report for a valid account', async () => {
    const response = await handler({ accountId: 'Checking', months: 6, includeOffBudget: false });

    expect(response.isError).toBeUndefined();
    expect(response.content).toBeDefined();
  });

  it('returns a report for single month of history', async () => {
    const response = await handler({ accountId: 'Checking', months: 1, includeOffBudget: false });

    expect(response.isError).toBeUndefined();
  });

  it('returns error when data fetcher throws', async () => {
    mockFetchAll.mockRejectedValue(new Error('Unable to fetch account balance'));

    const response = await handler({
      accountId: 'NoSuchAccount',
      months: 3,
      includeOffBudget: false,
    });

    expect(response.isError).toBe(true);
  });

  it('handles empty transaction list gracefully', async () => {
    mockFetchAll.mockResolvedValue({
      account: SAMPLE_ACCOUNT,
      accounts: [SAMPLE_ACCOUNT],
      transactions: [],
      warnings: [],
    });

    const response = await handler({ accountId: 'Checking', months: 6, includeOffBudget: false });

    expect(response.isError).toBeUndefined();
  });

  it('includes warnings in report without erroring', async () => {
    mockFetchAll.mockResolvedValue({
      account: undefined,
      accounts: [SAMPLE_ACCOUNT],
      transactions: SAMPLE_TRANSACTIONS,
      warnings: ['Some accounts had errors'],
    });

    const response = await handler({ accountId: 'Checking', months: 3, includeOffBudget: false });

    expect(response.isError).toBeUndefined();
  });
});
