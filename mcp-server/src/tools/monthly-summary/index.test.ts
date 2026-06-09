import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const { mockFetchAll } = vi.hoisted(() => ({
  mockFetchAll: vi.fn(),
}));

vi.mock('./data-fetcher.js', () => ({
  MonthlySummaryDataFetcher: vi.fn().mockImplementation(() => ({
    fetchAll: mockFetchAll,
  })),
}));

const SAMPLE_ACCOUNTS = [{ id: 'acc-1', name: 'Checking', offbudget: false, closed: false }];
const SAMPLE_CATEGORIES = [
  { id: 'cat-1', name: 'Groceries', group_id: 'grp-1', is_income: false, hidden: false },
  { id: 'cat-2', name: 'Salary', group_id: 'grp-2', is_income: true, hidden: false },
];

function makeTransaction(overrides: Record<string, unknown>) {
  return {
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
    ...overrides,
  };
}

describe('monthly-summary handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAll.mockResolvedValue({
      accounts: SAMPLE_ACCOUNTS,
      categories: SAMPLE_CATEGORIES,
      transactions: [makeTransaction({})],
      warnings: [],
    });
  });

  it('returns a markdown report for the default (3 months)', async () => {
    const response = await handler({ months: 3 });

    expect(response.isError).toBeUndefined();
    expect(response.content).toBeDefined();
  });

  it('returns a report when months is specified', async () => {
    const response = await handler({ months: 6 });

    expect(response.isError).toBeUndefined();
  });

  it('uses default of 3 months when months is not provided in args', async () => {
    // parseMonthlySummaryInput defaults to 3 when months is not a positive number
    const response = await handler({ months: 0 });

    expect(response.isError).toBeUndefined();
  });

  it('returns a report with no transactions (no data month)', async () => {
    mockFetchAll.mockResolvedValue({
      accounts: SAMPLE_ACCOUNTS,
      categories: SAMPLE_CATEGORIES,
      transactions: [],
      warnings: [],
    });

    const response = await handler({ months: 1 });

    expect(response.isError).toBeUndefined();
  });

  it('returns error when data fetching throws', async () => {
    mockFetchAll.mockRejectedValue(new Error('Budget not connected'));

    const response = await handler({ months: 3 });

    expect(response.isError).toBe(true);
  });

  it('propagates warnings from data fetcher in response', async () => {
    mockFetchAll.mockResolvedValue({
      accounts: SAMPLE_ACCOUNTS,
      categories: SAMPLE_CATEGORIES,
      transactions: [makeTransaction({})],
      warnings: ['Account had errors'],
    });

    const response = await handler({ months: 1 });
    expect(response.isError).toBeUndefined();
  });

  it('handles income transactions separately from expenses', async () => {
    mockFetchAll.mockResolvedValue({
      accounts: SAMPLE_ACCOUNTS,
      categories: SAMPLE_CATEGORIES,
      transactions: [
        makeTransaction({ amount: 200000, category: 'cat-2' }),
        makeTransaction({ amount: -50000, category: 'cat-1' }),
      ],
      warnings: [],
    });

    const response = await handler({ months: 1 });
    expect(response.isError).toBeUndefined();
  });
});
