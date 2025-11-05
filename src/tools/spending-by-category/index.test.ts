import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';
import type { SpendingByCategoryArgs } from '../../core/types/index.js';

// Mock all dependencies
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getCategories: vi.fn(),
  getCategoryGroups: vi.fn(),
}));

vi.mock('../../core/cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: vi.fn(),
    isEnabled: vi.fn(),
    clear: vi.fn(),
  },
}));

import { getAccounts, getTransactions, getCategories, getCategoryGroups } from '../../actual-api.js';
import { cacheService } from '../../core/cache/cache-service.js';

describe('spending-by-category tool integration', () => {
  const mockAccounts = [{ id: 'acc1', name: 'Checking', type: 'checking', offbudget: false, closed: false }];

  const mockCategoryGroups = [
    { id: 'grp1', name: 'Living Expenses', hidden: false, categories: [] },
    { id: 'grp2', name: 'Income', hidden: false, categories: [] },
  ];

  const mockCategories = [
    { id: 'cat1', name: 'Groceries', group_id: 'grp1', is_income: false, hidden: false },
    { id: 'cat2', name: 'Utilities', group_id: 'grp1', is_income: false, hidden: false },
    { id: 'cat3', name: 'Salary', group_id: 'grp2', is_income: true, hidden: false },
  ];

  const mockTransactions = [
    {
      id: 'tx1',
      account: 'acc1',
      date: '2024-01-15',
      amount: -5000,
      category: 'cat1',
    },
    {
      id: 'tx2',
      account: 'acc1',
      date: '2024-01-20',
      amount: -3000,
      category: 'cat2',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(getCategoryGroups).mockResolvedValue(mockCategoryGroups);
    vi.mocked(getTransactions).mockResolvedValue(mockTransactions);
  });

  describe('with caching enabled', () => {
    beforeEach(() => {
      vi.mocked(cacheService.isEnabled).mockReturnValue(true);
      vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });
    });

    it('should execute successfully and return markdown report', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const result = await handler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Spending by Category');
    });

    it('should use cached data fetchers', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      await handler(args);

      expect(cacheService.getOrFetch).toHaveBeenCalled();
    });

    it('should handle account-specific queries', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        accountId: 'acc1',
      };

      const result = await handler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Checking');
    });

    it('should handle includeIncome parameter', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeIncome: true,
      };

      const result = await handler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBeDefined();
    });
  });

  describe('with caching disabled', () => {
    beforeEach(() => {
      vi.mocked(cacheService.isEnabled).mockReturnValue(false);
      vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });
    });

    it('should execute successfully without cache', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const result = await handler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
    });

    it('should call API directly when cache is disabled', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      await handler(args);

      expect(getAccounts).toHaveBeenCalled();
      expect(getCategories).toHaveBeenCalled();
      expect(getCategoryGroups).toHaveBeenCalled();
    });
  });

  describe('response format verification', () => {
    beforeEach(() => {
      vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });
    });

    it('should maintain consistent response structure', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const result = await handler(args);

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should include category breakdown in report', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const result = await handler(args);
      const text = result.content[0].text;

      expect(text).toContain('Spending by Category');
      expect(text).toContain('Period:');
    });
  });
});
