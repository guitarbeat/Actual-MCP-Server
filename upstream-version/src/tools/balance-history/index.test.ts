import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BalanceHistoryArgs } from '../../core/types/index.js';
import { handler } from './index.js';

// Mock all dependencies
vi.mock('../../actual-api.js', async () => {
  const actual = await vi.importActual('../../actual-api.js');
  return {
    ...actual,
    initActualApi: vi.fn().mockResolvedValue(undefined),
    getAccountBalance: vi.fn(),
  };
});

vi.mock('@actual-app/api', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../../core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

vi.mock('../../core/data/fetch-transactions.js', () => ({
  fetchAllTransactions: vi.fn(),
  fetchTransactionsForAccount: vi.fn(),
}));

vi.mock('../../core/utils/account-selector.js', () => ({
  resolveAccountSelection: vi.fn(),
}));

import { getAccountBalance, initActualApi } from '../../actual-api.js';
import { cacheService } from '../../core/cache/cache-service.js';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAllTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import { resolveAccountSelection } from '../../core/utils/account-selector.js';

describe('balance-history tool integration', () => {
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
    vi.mocked(initActualApi).mockResolvedValue(undefined);
    vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(fetchTransactionsForAccount).mockResolvedValue(mockTransactions);
    vi.mocked(fetchAllTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(getAccountBalance).mockResolvedValue(50000);
    vi.mocked(resolveAccountSelection).mockResolvedValue({
      accountId: 'acc1',
      account: mockAccounts[0],
    });
  });

  describe('with caching enabled', () => {
    beforeEach(() => {
      vi.mocked(cacheService.isEnabled).mockReturnValue(true);
      vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });
    });

    it('should execute successfully and return markdown report', async () => {
      const args: BalanceHistoryArgs = {
        accountId: 'Checking',
        months: 3,
        includeOffBudget: false,
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      const content0 = result.content[0];
      expect(content0.type).toBe('text');
      expect(content0.type === 'text' && content0.text).toContain('Balance History');
    });

    it('should use cached data fetchers', async () => {
      const args: BalanceHistoryArgs = {
        accountId: 'Checking',
        months: 3,
        includeOffBudget: false,
      };

      await handler(args);

      // Note: balance-history doesn't use cacheService.getOrFetch directly
      // It uses fetchAllAccounts/fetchTransactionsForAccount which may use caching internally
      expect(fetchAllAccounts).toHaveBeenCalled();
    });

    it('should handle account-specific queries', async () => {
      const args: BalanceHistoryArgs = {
        accountId: 'Checking',
        months: 3,
        includeOffBudget: false,
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      const content0 = result.content[0];
      expect(content0.type === 'text' && content0.text).toContain('Checking');
    });

    it('should fetch balances in parallel for multiple accounts', async () => {
      const args: BalanceHistoryArgs = {
        accountId: 'Checking',
        months: 3,
        includeOffBudget: false,
      };
      vi.mocked(resolveAccountSelection).mockResolvedValue({
        accountId: undefined,
        account: undefined,
      });

      await handler(args);

      // Verify getAccountBalance was called for each account
      expect(getAccountBalance).toHaveBeenCalled();
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
      const args: BalanceHistoryArgs = {
        accountId: 'Checking',
        months: 3,
        includeOffBudget: false,
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
    });

    it('should call API directly when cache is disabled', async () => {
      const args: BalanceHistoryArgs = {
        accountId: 'Checking',
        months: 3,
        includeOffBudget: false,
      };

      await handler(args);

      expect(fetchAllAccounts).toHaveBeenCalled();
      expect(getAccountBalance).toHaveBeenCalled();
    });
  });

  describe('response format verification', () => {
    beforeEach(() => {
      vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => {
        return fetchFn();
      });
    });

    it('should maintain consistent response structure', async () => {
      const args: BalanceHistoryArgs = {
        accountId: 'Checking',
        months: 6,
        includeOffBudget: false,
      };

      const result = await handler(args);

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined(); // Success responses don't have isError set
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should include balance history in report', async () => {
      const args: BalanceHistoryArgs = {
        accountId: 'Checking',
        months: 3,
        includeOffBudget: false,
      };

      const result = await handler(args);
      const content0 = result.content[0];
      const text = content0.type === 'text' ? content0.text : '';

      expect(text).toContain('Balance History');
      expect(text).toContain('Period:');
    });

    it('should handle single account balance history', async () => {
      const args: BalanceHistoryArgs = {
        accountId: 'Checking',
        months: 3,
        includeOffBudget: false,
      };

      const result = await handler(args);
      const content0 = result.content[0];
      const text = content0.type === 'text' ? content0.text : '';

      expect(text).toContain('Checking');
      expect(result.isError).toBeUndefined();
    });
  });
});
