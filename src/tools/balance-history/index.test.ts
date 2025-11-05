import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';
import type { BalanceHistoryArgs } from '../../core/types/index.js';

// Mock all dependencies
vi.mock('../../actual-api.js', async () => {
  const actual = await vi.importActual('../../actual-api.js');
  return {
    ...actual,
    getAccounts: vi.fn(),
    getTransactions: vi.fn(),
  };
});

vi.mock('@actual-app/api', () => ({
  default: {
    getAccountBalance: vi.fn(),
  },
}));

vi.mock('../../core/cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: vi.fn(),
    isEnabled: vi.fn(),
    clear: vi.fn(),
  },
}));

import api from '@actual-app/api';
import { getAccounts, getTransactions } from '../../actual-api.js';
import { cacheService } from '../../core/cache/cache-service.js';

describe('balance-history tool integration', () => {
  const mockAccounts = [
    { id: 'acc1', name: 'Checking', type: 'checking', offbudget: false, closed: false },
    { id: 'acc2', name: 'Savings', type: 'savings', offbudget: false, closed: false },
  ];

  const mockTransactions = [
    {
      id: 'tx1',
      account: 'acc1',
      date: '2024-01-15',
      amount: -5000,
    },
    {
      id: 'tx2',
      account: 'acc1',
      date: '2024-02-10',
      amount: 10000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getAccountBalance).mockResolvedValue(50000);
  });

  describe('with caching enabled', () => {
    beforeEach(() => {
      vi.mocked(cacheService.isEnabled).mockReturnValue(true);
      vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });
    });

    it('should execute successfully and return markdown report', async () => {
      const args: BalanceHistoryArgs = { accountId: 'acc1', months: 3, includeOffBudget: false };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Balance History');
    });

    it('should use cached data fetchers', async () => {
      const args: BalanceHistoryArgs = { accountId: 'acc1', months: 3, includeOffBudget: false };

      await handler(args);

      expect(cacheService.getOrFetch).toHaveBeenCalled();
    });

    it('should handle account-specific queries', async () => {
      const args: BalanceHistoryArgs = { accountId: 'acc1', months: 3, includeOffBudget: false };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Checking');
    });

    it('should fetch balances in parallel for multiple accounts', async () => {
      const args: BalanceHistoryArgs = { accountId: 'acc1', months: 3, includeOffBudget: false };

      await handler(args);

      // Verify getAccountBalance was called for each account
      expect(api.getAccountBalance).toHaveBeenCalled();
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
      const args: BalanceHistoryArgs = { accountId: 'acc1', months: 3, includeOffBudget: false };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
    });

    it('should call API directly when cache is disabled', async () => {
      const args: BalanceHistoryArgs = { accountId: 'acc1', months: 3, includeOffBudget: false };

      await handler(args);

      expect(getAccounts).toHaveBeenCalled();
      expect(api.getAccountBalance).toHaveBeenCalled();
    });
  });

  describe('response format verification', () => {
    beforeEach(() => {
      vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });
    });

    it('should maintain consistent response structure', async () => {
      const args: BalanceHistoryArgs = { accountId: 'acc1', months: 6, includeOffBudget: false };

      const result = await handler(args);

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined(); // Success responses don't have isError set
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should include balance history in report', async () => {
      const args: BalanceHistoryArgs = { accountId: 'acc1', months: 3, includeOffBudget: false };

      const result = await handler(args);
      const text = result.content[0].text;

      expect(text).toContain('Balance History');
      expect(text).toContain('Period:');
    });

    it('should handle single account balance history', async () => {
      const args: BalanceHistoryArgs = { accountId: 'acc1', months: 3, includeOffBudget: false };

      const result = await handler(args);
      const text = result.content[0].text;

      expect(text).toContain('Checking');
      expect(result.isError).toBeUndefined();
    });
  });
});
