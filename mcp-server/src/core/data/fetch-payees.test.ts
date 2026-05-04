import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAllPayees, fetchAllPayeesMap } from './fetch-payees.js';

const mockGetPayees = vi.fn();
const mockCacheGetOrFetch = vi.fn();

vi.mock('../../core/api/actual-client.js', () => ({
  getPayees: (...args: unknown[]) => mockGetPayees(...args),
}));

vi.mock('../cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: (...args: unknown[]) => mockCacheGetOrFetch(...args),
  },
}));

const samplePayees = [
  { id: 'p-1', name: 'Amazon' },
  { id: 'p-2', name: 'Whole Foods' },
];

describe('fetch-payees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPayees.mockResolvedValue(samplePayees);
  });

  describe('fetchAllPayees', () => {
    it('delegates to getPayees', async () => {
      const result = await fetchAllPayees();
      expect(mockGetPayees).toHaveBeenCalledTimes(1);
      expect(result).toEqual(samplePayees);
    });
  });

  describe('fetchAllPayeesMap', () => {
    it('calls cacheService.getOrFetch with key "payees:map"', async () => {
      mockCacheGetOrFetch.mockImplementation(async (_key: string, fn: () => Promise<unknown>) =>
        fn(),
      );
      await fetchAllPayeesMap();
      expect(mockCacheGetOrFetch).toHaveBeenCalledWith('payees:map', expect.any(Function));
    });

    it('returns a map keyed by payee id', async () => {
      mockCacheGetOrFetch.mockImplementation(async (_key: string, fn: () => Promise<unknown>) =>
        fn(),
      );
      const result = await fetchAllPayeesMap();
      expect(result['p-1']).toEqual(samplePayees[0]);
      expect(result['p-2']).toEqual(samplePayees[1]);
    });

    it('returns cached result when available', async () => {
      const cachedMap = { 'p-cached': { id: 'p-cached', name: 'Cached Payee' } };
      mockCacheGetOrFetch.mockResolvedValue(cachedMap);
      const result = await fetchAllPayeesMap();
      expect(result).toEqual(cachedMap);
      expect(mockGetPayees).not.toHaveBeenCalled();
    });
  });
});
