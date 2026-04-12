import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAccounts } from './data-fetcher.js';

// Mock dependencies
const mockFetchAllAccounts = vi.fn();
const mockGetAccountBalance = vi.fn();

vi.mock('../../core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: () => mockFetchAllAccounts(),
}));

vi.mock('../../core/api/actual-client.js', () => ({
  getAccountBalance: (id: string) => mockGetAccountBalance(id),
}));

vi.mock('../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: vi.fn(),
  },
}));

describe('fetchAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches accounts and assigns balances correctly', async () => {
    const accounts = [
      { id: 'acc-1', name: 'Account 1', closed: false },
      { id: 'acc-2', name: 'Account 2', closed: false },
    ];

    mockFetchAllAccounts.mockResolvedValue(accounts);
    mockGetAccountBalance.mockImplementation(async (id) => {
      if (id === 'acc-1') return 1000;
      if (id === 'acc-2') return 2000;
      return 0;
    });

    const result = await fetchAccounts({ includeClosed: false });

    expect(result.partial).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.accounts).toHaveLength(2);
    expect(result.accounts[0].id).toBe('acc-1');
    expect(result.accounts[0].balance).toBe(1000);
    expect(result.accounts[1].id).toBe('acc-2');
    expect(result.accounts[1].balance).toBe(2000);

    expect(mockGetAccountBalance).toHaveBeenCalledTimes(2);
    expect(mockGetAccountBalance).toHaveBeenCalledWith('acc-1');
    expect(mockGetAccountBalance).toHaveBeenCalledWith('acc-2');
  });

  it('filters closed accounts by default', async () => {
    const accounts = [
      { id: 'acc-1', name: 'Open Account', closed: false },
      { id: 'acc-2', name: 'Closed Account', closed: true },
    ];

    mockFetchAllAccounts.mockResolvedValue(accounts);
    mockGetAccountBalance.mockResolvedValue(100);

    const result = await fetchAccounts({ includeClosed: false });

    expect(result.partial).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].id).toBe('acc-1');
    expect(mockGetAccountBalance).toHaveBeenCalledTimes(1);
    expect(mockGetAccountBalance).toHaveBeenCalledWith('acc-1');
  });

  it('includes closed accounts when requested', async () => {
    const accounts = [
      { id: 'acc-1', name: 'Open Account', closed: false },
      { id: 'acc-2', name: 'Closed Account', closed: true },
    ];

    mockFetchAllAccounts.mockResolvedValue(accounts);
    mockGetAccountBalance.mockResolvedValue(100);

    const result = await fetchAccounts({ includeClosed: true });

    expect(result.partial).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.accounts).toHaveLength(2);
    expect(mockGetAccountBalance).toHaveBeenCalledTimes(2);
  });
});
