import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAccountsDataFetcher } from './data-fetcher.js';
import { getAccountBalance } from '@actual-app/api';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';

vi.mock('@actual-app/api', () => ({
  getAccountBalance: vi.fn(),
}));

vi.mock('../../core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

describe('GetAccountsDataFetcher', () => {
  const fetcher = new GetAccountsDataFetcher();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch accounts with balances', async () => {
    const mockAccounts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Checking',
        type: 'checking',
        closed: false,
        offbudget: false,
        balance: 0,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Savings',
        type: 'savings',
        closed: false,
        offbudget: false,
        balance: 0,
      },
    ];

    vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(getAccountBalance).mockResolvedValueOnce(10000).mockResolvedValueOnce(50000);

    const result = await fetcher.fetchAccounts();

    expect(result).toHaveLength(2);
    expect(result[0].balance).toBe(10000);
    expect(result[1].balance).toBe(50000);
    expect(getAccountBalance).toHaveBeenCalledTimes(2);
  });

  it('should handle empty account list', async () => {
    vi.mocked(fetchAllAccounts).mockResolvedValue([]);

    const result = await fetcher.fetchAccounts();

    expect(result).toHaveLength(0);
    expect(getAccountBalance).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    vi.mocked(fetchAllAccounts).mockRejectedValue(new Error('API error'));

    await expect(fetcher.fetchAccounts()).rejects.toThrow('API error');
  });
});
