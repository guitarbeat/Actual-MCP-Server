import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const { mockFetchAll } = vi.hoisted(() => ({
  mockFetchAll: vi.fn(),
}));

vi.mock('./data-fetcher.js', () => ({
  SpendingByCategoryDataFetcher: vi.fn().mockImplementation(() => ({
    fetchAll: mockFetchAll,
  })),
}));

const SAMPLE_ACCOUNTS = [{ id: 'acc-1', name: 'Checking', offbudget: false, closed: false }];
const SAMPLE_CATEGORIES = [
  { id: 'cat-1', name: 'Groceries', group_id: 'grp-1', is_income: false, hidden: false },
];
const SAMPLE_GROUPS = [{ id: 'grp-1', name: 'Food', hidden: false, is_income: false }];
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

describe('spending-by-category handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAll.mockResolvedValue({
      accounts: SAMPLE_ACCOUNTS,
      categories: SAMPLE_CATEGORIES,
      categoryGroups: SAMPLE_GROUPS,
      transactions: SAMPLE_TRANSACTIONS,
      warnings: [],
    });
  });

  it('returns a report for valid month input', async () => {
    const response = await handler({ startDate: '2024-01-01', endDate: '2024-01-31' });

    expect(response.isError).toBeUndefined();
    expect(response.content).toBeDefined();
    const textContent = (response.content as Array<{ text?: string }>).find((c) => c.text);
    expect(textContent?.text).toBeDefined();
  });

  it('returns a report when no arguments are provided (uses defaults)', async () => {
    const response = await handler({});

    expect(response.isError).toBeUndefined();
  });

  it('returns a report with no transactions (empty result)', async () => {
    mockFetchAll.mockResolvedValue({
      accounts: SAMPLE_ACCOUNTS,
      categories: SAMPLE_CATEGORIES,
      categoryGroups: SAMPLE_GROUPS,
      transactions: [],
      warnings: [],
    });

    const response = await handler({ startDate: '2024-01-01', endDate: '2024-03-31' });

    expect(response.isError).toBeUndefined();
  });

  it('returns error when data fetcher throws', async () => {
    mockFetchAll.mockRejectedValue(new Error('Database connection failed'));

    const response = await handler({});

    expect(response.isError).toBe(true);
  });

  it('includes warnings in the response when warnings are returned', async () => {
    mockFetchAll.mockResolvedValue({
      accounts: SAMPLE_ACCOUNTS,
      categories: SAMPLE_CATEGORIES,
      categoryGroups: SAMPLE_GROUPS,
      transactions: SAMPLE_TRANSACTIONS,
      warnings: ['Account X had errors'],
    });

    const response = await handler({});
    expect(response.isError).toBeUndefined();
  });
});
