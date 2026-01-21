
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findUncategorizedTransactions } from './financial-analyzer.js';
import * as actualClient from '../api/actual-client.js';

// Mock the dependencies
vi.mock('../api/actual-client.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getBudgetMonth: vi.fn(),
  getSchedules: vi.fn(),
  getAccountBalance: vi.fn(),
}));

// Mock formatting utils implicitly used or ensure they work
// The real implementations of formatting utils are pure and should work fine

describe('financial-analyzer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('findUncategorizedTransactions', () => {
    it('should aggregate uncategorized transactions from all accounts', async () => {
      // Mock getAccounts
      vi.mocked(actualClient.getAccounts).mockResolvedValue([
        { id: 'acc1', name: 'Account 1', type: 'checking', closed: false, offbudget: false },
        { id: 'acc2', name: 'Account 2', type: 'checking', closed: false, offbudget: false },
      ] as any);

      // Mock getTransactions
      vi.mocked(actualClient.getTransactions).mockImplementation(async (accountId) => {
        // Simulate a slight delay to ensure Promise.all is actually working conceptually
        // though in unit tests with no timers it just resolves.
        if (accountId === 'acc1') {
          return [
            { id: 't1', amount: -1000, category: null, payee: 'Store A', date: '2023-01-01', account: 'acc1' },
            { id: 't2', amount: -2000, category: 'cat1', payee: 'Store B', date: '2023-01-02', account: 'acc1' },
          ] as any;
        }
        if (accountId === 'acc2') {
          return [
             { id: 't3', amount: -3000, category: null, payee: 'Store A', date: '2023-01-03', account: 'acc2' },
          ] as any;
        }
        return [];
      });

      const result = await findUncategorizedTransactions('2023-01');

      // Verification
      expect(result.count).toBe(2); // t1 and t3 are uncategorized
      expect(result.totalAmount).toBe(4000); // abs(-1000) + abs(-3000)
      expect(result.topPayees).toEqual(['Store A']);

      // Verify calls
      expect(actualClient.getAccounts).toHaveBeenCalledTimes(1);
      expect(actualClient.getTransactions).toHaveBeenCalledTimes(2);
    });

    it('should handle empty accounts', async () => {
      vi.mocked(actualClient.getAccounts).mockResolvedValue([]);

      const result = await findUncategorizedTransactions('2023-01');

      expect(result.count).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(actualClient.getTransactions).not.toHaveBeenCalled();
    });
  });
});
