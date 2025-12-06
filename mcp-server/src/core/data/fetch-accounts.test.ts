import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAllAccounts } from './fetch-accounts.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
}));

vi.mock('../cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: vi.fn(),
    clear: vi.fn(),
  },
}));

import { getAccounts } from '../../actual-api.js';
import { cacheService } from '../cache/cache-service.js';

describe('fetchAllAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return accounts from API', async () => {
    const mockAccounts = [
      {
        id: '1',
        name: 'Test Account',
        type: 'checking',
        offbudget: false,
        closed: false,
      },
      {
        id: '2',
        name: 'Savings Account',
        type: 'savings',
        offbudget: false,
        closed: false,
      },
    ];
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllAccounts();

    expect(result).toEqual(mockAccounts);
    expect(cacheService.getOrFetch).toHaveBeenCalledWith('accounts:all', expect.any(Function), 5 * 60 * 1000);
  });

  it('should handle API errors', async () => {
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });
    vi.mocked(getAccounts).mockRejectedValue(new Error('API Error'));

    await expect(fetchAllAccounts()).rejects.toThrow('API Error');
  });

  it('should handle empty response', async () => {
    vi.mocked(getAccounts).mockResolvedValue([]);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllAccounts();

    expect(result).toEqual([]);
  });

  it('should use cache on repeated calls (cache hit)', async () => {
    const mockAccounts = [
      {
        id: '1',
        name: 'Test Account',
        type: 'checking',
        offbudget: false,
        closed: false,
      },
    ];

    // First call - cache miss, fetches from API
    vi.mocked(cacheService.getOrFetch).mockResolvedValueOnce(mockAccounts);
    const result1 = await fetchAllAccounts();

    // Second call - cache hit, returns cached data
    vi.mocked(cacheService.getOrFetch).mockResolvedValueOnce(mockAccounts);
    const result2 = await fetchAllAccounts();

    expect(result1).toEqual(mockAccounts);
    expect(result2).toEqual(mockAccounts);
    expect(cacheService.getOrFetch).toHaveBeenCalledTimes(2);
  });

  it('should fetch from API on first call (cache miss)', async () => {
    const mockAccounts = [
      {
        id: '1',
        name: 'Test Account',
        type: 'checking',
        offbudget: false,
        closed: false,
      },
    ];
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllAccounts();

    expect(result).toEqual(mockAccounts);
    expect(cacheService.getOrFetch).toHaveBeenCalledWith('accounts:all', expect.any(Function), 5 * 60 * 1000);
    expect(getAccounts).toHaveBeenCalledOnce();
  });

  it('should use correct TTL (5 minutes)', async () => {
    const mockAccounts = [
      {
        id: '1',
        name: 'Test Account',
        type: 'checking',
        offbudget: false,
        closed: false,
      },
    ];
    vi.mocked(cacheService.getOrFetch).mockResolvedValue(mockAccounts);

    await fetchAllAccounts();

    expect(cacheService.getOrFetch).toHaveBeenCalledWith(
      'accounts:all',
      expect.any(Function),
      5 * 60 * 1000 // 5 minutes in milliseconds
    );
  });
});
