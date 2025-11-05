import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllCategories, fetchAllCategoryGroups } from './fetch-categories.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getCategories: vi.fn(),
  getCategoryGroups: vi.fn(),
}));

vi.mock('../cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: vi.fn(),
    clear: vi.fn(),
  },
}));

import { getCategories, getCategoryGroups } from '../../actual-api.js';
import { cacheService } from '../cache/cache-service.js';

describe('fetchAllCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return categories from API', async () => {
    const mockCategories = [
      { id: '1', name: 'Food', group_id: 'g1' },
      { id: '2', name: 'Transport', group_id: 'g2' },
    ];
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllCategories();

    expect(result).toEqual(mockCategories);
    expect(cacheService.getOrFetch).toHaveBeenCalledWith('categories:all', expect.any(Function), 5 * 60 * 1000);
  });

  it('should handle API errors', async () => {
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });
    vi.mocked(getCategories).mockRejectedValue(new Error('Categories API Error'));

    await expect(fetchAllCategories()).rejects.toThrow('Categories API Error');
  });

  it('should handle empty response', async () => {
    vi.mocked(getCategories).mockResolvedValue([]);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllCategories();

    expect(result).toEqual([]);
  });

  it('should use cache on repeated calls (cache hit)', async () => {
    const mockCategories = [{ id: '1', name: 'Food', group_id: 'g1' }];

    vi.mocked(cacheService.getOrFetch).mockResolvedValueOnce(mockCategories);
    const result1 = await fetchAllCategories();

    vi.mocked(cacheService.getOrFetch).mockResolvedValueOnce(mockCategories);
    const result2 = await fetchAllCategories();

    expect(result1).toEqual(mockCategories);
    expect(result2).toEqual(mockCategories);
    expect(cacheService.getOrFetch).toHaveBeenCalledTimes(2);
  });

  it('should fetch from API on first call (cache miss)', async () => {
    const mockCategories = [{ id: '1', name: 'Food', group_id: 'g1' }];
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllCategories();

    expect(result).toEqual(mockCategories);
    expect(cacheService.getOrFetch).toHaveBeenCalledWith('categories:all', expect.any(Function), 5 * 60 * 1000);
    expect(getCategories).toHaveBeenCalledOnce();
  });

  it('should use correct TTL (5 minutes)', async () => {
    const mockCategories = [{ id: '1', name: 'Food', group_id: 'g1' }];
    vi.mocked(cacheService.getOrFetch).mockResolvedValue(mockCategories);

    await fetchAllCategories();

    expect(cacheService.getOrFetch).toHaveBeenCalledWith('categories:all', expect.any(Function), 5 * 60 * 1000);
  });
});

describe('fetchAllCategoryGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return category groups from API', async () => {
    const mockCategoryGroups = [
      { id: 'g1', name: 'Living', is_income: false, hidden: false, categories: [] },
      { id: 'g2', name: 'Income', is_income: true, hidden: false, categories: [] },
    ];
    vi.mocked(getCategoryGroups).mockResolvedValue(mockCategoryGroups);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllCategoryGroups();

    expect(result).toEqual(mockCategoryGroups);
    expect(cacheService.getOrFetch).toHaveBeenCalledWith('categoryGroups:all', expect.any(Function), 5 * 60 * 1000);
  });

  it('should handle API errors', async () => {
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });
    vi.mocked(getCategoryGroups).mockRejectedValue(new Error('Category Groups API Error'));

    await expect(fetchAllCategoryGroups()).rejects.toThrow('Category Groups API Error');
  });

  it('should handle empty response', async () => {
    vi.mocked(getCategoryGroups).mockResolvedValue([]);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllCategoryGroups();

    expect(result).toEqual([]);
  });

  it('should use cache on repeated calls (cache hit)', async () => {
    const mockCategoryGroups = [{ id: 'g1', name: 'Living', is_income: false, hidden: false, categories: [] }];

    vi.mocked(cacheService.getOrFetch).mockResolvedValueOnce(mockCategoryGroups);
    const result1 = await fetchAllCategoryGroups();

    vi.mocked(cacheService.getOrFetch).mockResolvedValueOnce(mockCategoryGroups);
    const result2 = await fetchAllCategoryGroups();

    expect(result1).toEqual(mockCategoryGroups);
    expect(result2).toEqual(mockCategoryGroups);
    expect(cacheService.getOrFetch).toHaveBeenCalledTimes(2);
  });

  it('should fetch from API on first call (cache miss)', async () => {
    const mockCategoryGroups = [{ id: 'g1', name: 'Living', is_income: false, hidden: false, categories: [] }];
    vi.mocked(getCategoryGroups).mockResolvedValue(mockCategoryGroups);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
      return fetchFn();
    });

    const result = await fetchAllCategoryGroups();

    expect(result).toEqual(mockCategoryGroups);
    expect(cacheService.getOrFetch).toHaveBeenCalledWith('categoryGroups:all', expect.any(Function), 5 * 60 * 1000);
    expect(getCategoryGroups).toHaveBeenCalledOnce();
  });

  it('should use correct TTL (5 minutes)', async () => {
    const mockCategoryGroups = [{ id: 'g1', name: 'Living', is_income: false, hidden: false, categories: [] }];
    vi.mocked(cacheService.getOrFetch).mockResolvedValue(mockCategoryGroups);

    await fetchAllCategoryGroups();

    expect(cacheService.getOrFetch).toHaveBeenCalledWith('categoryGroups:all', expect.any(Function), 5 * 60 * 1000);
  });
});
