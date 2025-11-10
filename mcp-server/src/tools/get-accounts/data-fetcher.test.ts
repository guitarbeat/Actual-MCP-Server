import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAccountsDataFetcher } from './data-fetcher.js';
import { getAccountBalance } from '../../actual-api.js';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { nameResolver } from '../../core/utils/name-resolver.js';

vi.mock('../../actual-api.js', () => ({
  getAccountBalance: vi.fn(),
}));

vi.mock('../../core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

vi.mock('../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: vi.fn(),
  },
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

    const result = await fetcher.fetchAccounts({ includeClosed: false });

    expect(result).toHaveLength(2);
    expect(result[0].balance).toBe(10000);
    expect(result[1].balance).toBe(50000);
    expect(getAccountBalance).toHaveBeenCalledTimes(2);
  });

  it('should filter by account ID', async () => {
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
    // Use a UUID-like string to trigger ID resolution path
    vi.mocked(nameResolver.resolveAccount).mockResolvedValue('550e8400-e29b-41d4-a716-446655440000');
    vi.mocked(getAccountBalance).mockResolvedValue(10000);

    const result = await fetcher.fetchAccounts({
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      includeClosed: false,
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Checking');
    expect(nameResolver.resolveAccount).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should support partial name matching', async () => {
    const mockAccounts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '🏦 Chase Checking',
        type: 'checking',
        closed: false,
        offbudget: false,
        balance: 0,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: '💰 Chase Savings',
        type: 'savings',
        closed: false,
        offbudget: false,
        balance: 0,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Wells Fargo',
        type: 'checking',
        closed: false,
        offbudget: false,
        balance: 0,
      },
    ];

    vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(nameResolver.resolveAccount).mockRejectedValue(new Error('Account not found'));
    vi.mocked(getAccountBalance).mockResolvedValue(10000);

    const result = await fetcher.fetchAccounts({
      accountId: 'Chase',
      includeClosed: false,
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('🏦 Chase Checking');
    expect(result[1].name).toBe('💰 Chase Savings');
  });

  it('should prefer exact match over partial match', async () => {
    const mockAccounts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Chase Checking',
        type: 'checking',
        closed: false,
        offbudget: false,
        balance: 0,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Chase Savings',
        type: 'savings',
        closed: false,
        offbudget: false,
        balance: 0,
      },
    ];

    vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(nameResolver.resolveAccount).mockResolvedValue('550e8400-e29b-41d4-a716-446655440000');
    vi.mocked(getAccountBalance).mockResolvedValue(10000);

    const result = await fetcher.fetchAccounts({
      accountId: 'Chase Checking',
      includeClosed: false,
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Chase Checking');
  });

  it('should handle ID-like strings with exact match', async () => {
    const mockAccounts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Checking',
        type: 'checking',
        closed: false,
        offbudget: false,
        balance: 0,
      },
    ];

    vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(nameResolver.resolveAccount).mockResolvedValue('550e8400-e29b-41d4-a716-446655440000');
    vi.mocked(getAccountBalance).mockResolvedValue(10000);

    const result = await fetcher.fetchAccounts({
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      includeClosed: false,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should throw error when partial match finds no accounts', async () => {
    const mockAccounts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Checking',
        type: 'checking',
        closed: false,
        offbudget: false,
        balance: 0,
      },
    ];

    vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(nameResolver.resolveAccount).mockRejectedValue(new Error('Account not found'));

    await expect(
      fetcher.fetchAccounts({
        accountId: 'NonExistent',
        includeClosed: false,
      })
    ).rejects.toThrow("Account 'NonExistent' not found");
  });

  it('should exclude closed accounts by default', async () => {
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
        name: 'Old Savings',
        type: 'savings',
        closed: true,
        offbudget: false,
        balance: 0,
      },
    ];

    vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(getAccountBalance).mockResolvedValue(10000);

    const result = await fetcher.fetchAccounts({ includeClosed: false });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Checking');
  });

  it('should include closed accounts when requested', async () => {
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
        name: 'Old Savings',
        type: 'savings',
        closed: true,
        offbudget: false,
        balance: 0,
      },
    ];

    vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(getAccountBalance).mockResolvedValueOnce(10000).mockResolvedValueOnce(5000);

    const result = await fetcher.fetchAccounts({ includeClosed: true });

    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Old Savings');
  });

  it('should handle empty account list', async () => {
    vi.mocked(fetchAllAccounts).mockResolvedValue([]);

    const result = await fetcher.fetchAccounts({ includeClosed: false });

    expect(result).toHaveLength(0);
    expect(getAccountBalance).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    vi.mocked(fetchAllAccounts).mockRejectedValue(new Error('API error'));

    await expect(fetcher.fetchAccounts({ includeClosed: false })).rejects.toThrow('API error');
  });
});
