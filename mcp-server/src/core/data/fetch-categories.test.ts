import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAllCategories,
  fetchAllCategoriesMap,
  fetchAllCategoryGroups,
  fetchAllCategoryGroupsMap,
} from './fetch-categories.js';

const mockGetCategories = vi.fn();
const mockGetCategoryGroups = vi.fn();
const mockCacheGetOrFetch = vi.fn();

vi.mock('../../core/api/actual-client.js', () => ({
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
  getCategoryGroups: (...args: unknown[]) => mockGetCategoryGroups(...args),
}));

vi.mock('../cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: (...args: unknown[]) => mockCacheGetOrFetch(...args),
  },
}));

const sampleCategories = [
  { id: 'cat-1', name: 'Groceries', group_id: 'grp-1', is_income: false, hidden: false },
  { id: 'cat-2', name: 'Salary', group_id: 'grp-2', is_income: true, hidden: false },
];

const sampleGroups = [
  { id: 'grp-1', name: 'Living', hidden: false, is_income: false },
  { id: 'grp-2', name: 'Income', hidden: false, is_income: true },
];

describe('fetch-categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCategories.mockResolvedValue(sampleCategories);
    mockGetCategoryGroups.mockResolvedValue(sampleGroups);
  });

  describe('fetchAllCategories', () => {
    it('delegates to getCategories', async () => {
      const result = await fetchAllCategories();
      expect(mockGetCategories).toHaveBeenCalledTimes(1);
      expect(result).toEqual(sampleCategories);
    });
  });

  describe('fetchAllCategoryGroups', () => {
    it('delegates to getCategoryGroups', async () => {
      const result = await fetchAllCategoryGroups();
      expect(mockGetCategoryGroups).toHaveBeenCalledTimes(1);
      expect(result).toEqual(sampleGroups);
    });
  });

  describe('fetchAllCategoriesMap', () => {
    it('calls cacheService.getOrFetch with key "categories:map"', async () => {
      mockCacheGetOrFetch.mockImplementation(async (_key: string, fn: () => Promise<unknown>) =>
        fn(),
      );
      await fetchAllCategoriesMap();
      expect(mockCacheGetOrFetch).toHaveBeenCalledWith('categories:map', expect.any(Function));
    });

    it('returns a map keyed by category id', async () => {
      mockCacheGetOrFetch.mockImplementation(async (_key: string, fn: () => Promise<unknown>) =>
        fn(),
      );
      const result = await fetchAllCategoriesMap();
      expect(result['cat-1']).toEqual(sampleCategories[0]);
      expect(result['cat-2']).toEqual(sampleCategories[1]);
    });
  });

  describe('fetchAllCategoryGroupsMap', () => {
    it('calls cacheService.getOrFetch with key "categoryGroups:map"', async () => {
      mockCacheGetOrFetch.mockImplementation(async (_key: string, fn: () => Promise<unknown>) =>
        fn(),
      );
      await fetchAllCategoryGroupsMap();
      expect(mockCacheGetOrFetch).toHaveBeenCalledWith('categoryGroups:map', expect.any(Function));
    });

    it('returns a map keyed by group id', async () => {
      mockCacheGetOrFetch.mockImplementation(async (_key: string, fn: () => Promise<unknown>) =>
        fn(),
      );
      const result = await fetchAllCategoryGroupsMap();
      expect(result['grp-1']).toEqual(sampleGroups[0]);
      expect(result['grp-2']).toEqual(sampleGroups[1]);
    });
  });
});
