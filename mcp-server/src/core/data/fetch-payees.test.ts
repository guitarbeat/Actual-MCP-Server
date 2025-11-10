import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllPayees } from './fetch-payees.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getPayees: vi.fn(),
}));

vi.mock('../cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: vi.fn(),
    clear: vi.fn(),
  },
}));

import { getPayees } from '../../actual-api.js';
import { cacheService } from '../cache/cache-service.js';

describe('fetchAllPayees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return payees from API', async () => {
    const mockPayees = [
      { id: '1', name: 'Grocery Store' },
      { id: '2', name: 'Gas Station' },
    ];
    vi.mocked(getPayees).mockResolvedValue(mockPayees);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllPayees();

    expect(result).toEqual(mockPayees);
    expect(cacheService.getOrFetch).toHaveBeenCalledWith('payees:all', expect.any(Function), 5 * 60 * 1000);
  });

  it('should handle API errors', async () => {
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });
    vi.mocked(getPayees).mockRejectedValue(new Error('Payees API Error'));

    await expect(fetchAllPayees()).rejects.toThrow('Payees API Error');
  });

  it('should handle empty response', async () => {
    vi.mocked(getPayees).mockResolvedValue([]);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllPayees();

    expect(result).toEqual([]);
  });

  it('should use cache on repeated calls (cache hit)', async () => {
    const mockPayees = [{ id: '1', name: 'Grocery Store' }];

    vi.mocked(cacheService.getOrFetch).mockResolvedValueOnce(mockPayees);
    const result1 = await fetchAllPayees();

    vi.mocked(cacheService.getOrFetch).mockResolvedValueOnce(mockPayees);
    const result2 = await fetchAllPayees();

    expect(result1).toEqual(mockPayees);
    expect(result2).toEqual(mockPayees);
    expect(cacheService.getOrFetch).toHaveBeenCalledTimes(2);
  });

  it('should fetch from API on first call (cache miss)', async () => {
    const mockPayees = [{ id: '1', name: 'Grocery Store' }];
    vi.mocked(getPayees).mockResolvedValue(mockPayees);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllPayees();

    expect(result).toEqual(mockPayees);
    expect(cacheService.getOrFetch).toHaveBeenCalledWith('payees:all', expect.any(Function), 5 * 60 * 1000);
    expect(getPayees).toHaveBeenCalledOnce();
  });

  it('should use correct TTL (5 minutes)', async () => {
    const mockPayees = [{ id: '1', name: 'Grocery Store' }];
    vi.mocked(cacheService.getOrFetch).mockResolvedValue(mockPayees);

    await fetchAllPayees();

    expect(cacheService.getOrFetch).toHaveBeenCalledWith('payees:all', expect.any(Function), 5 * 60 * 1000);
  });
});
