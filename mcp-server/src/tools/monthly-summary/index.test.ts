import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MonthlySummaryArgs } from '../../core/types/index.js';
import { handler } from './index.js';

// Mock all dependencies
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getCategories: vi.fn(),
  getPayees: vi.fn(),
}));

vi.mock('../../core/cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: vi.fn(),
    isEnabled: vi.fn(),
    clear: vi.fn(),
  },
}));

import { getAccounts, getCategories, getTransactions } from '../../actual-api.js';
import { cacheService } from '../../core/cache/cache-service.js';

describe('monthly-summary tool integration', () => {
  const mockAccounts = [
    {
      id: 'acc1',
      name: 'Checking',
      type: 'checking',
      offbudget: false,
      closed: false,
    },
    {
      id: 'acc2',
      name: 'Savings',
      type: 'savings',
      offbudget: false,
      closed: false,
    },
  ];

  const mockCategories = [
    {
      id: 'cat1',
      name: 'Groceries',
      group_id: 'grp1',
      is_income: false,
      hidden: false,
    },
    {
      id: 'cat2',
      name: 'Salary',
      group_id: 'grp2',
      is_income: true,
      hidden: false,
    },
  ];

  const mockTransactions = [
    {
      id: 'tx1',
      account: 'acc1',
      date: '2024-01-15',
      amount: -5000,
      category: 'cat1',
      notes: 'Groceries',
    },
    {
      id: 'tx2',
      account: 'acc1',
      date: '2024-01-20',
      amount: 100000,
      category: 'cat2',
      notes: 'Salary',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
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
      const args: MonthlySummaryArgs = { months: 1 };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      const content0 = result.content[0];
      expect(content0.type).toBe('text');
      expect(content0.type === 'text' && content0.text).toContain('Monthly Financial Summary');
    });

    it('should use cached data fetchers', async () => {
      const args: MonthlySummaryArgs = { months: 1 };

      await handler(args);

      expect(cacheService.getOrFetch).toHaveBeenCalled();
    });

    it('should handle account-specific queries', async () => {
      const args: MonthlySummaryArgs = { months: 1, accountId: 'Checking' };

      const result = await handler(args);

      expect(result.isError).toBeFalsy();
      const content0 = result.content[0];
      expect(content0.type === 'text' && content0.text).toContain('Checking');
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
      const args: MonthlySummaryArgs = { months: 1 };

      const result = await handler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should call API directly when cache is disabled', async () => {
      const args: MonthlySummaryArgs = { months: 1 };

      await handler(args);

      expect(getAccounts).toHaveBeenCalled();
      expect(getCategories).toHaveBeenCalled();
    });
  });

  describe('response format verification', () => {
    beforeEach(() => {
      vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });
    });

    it('should maintain consistent response structure', async () => {
      const args: MonthlySummaryArgs = { months: 3 };

      const result = await handler(args);

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should include all required sections in report', async () => {
      const args: MonthlySummaryArgs = { months: 1 };

      const result = await handler(args);
      const content0 = result.content[0];
      const text = content0.type === 'text' ? content0.text : '';

      expect(text).toContain('Monthly Financial Summary');
      expect(text).toContain('Period:');
    });
  });
});
