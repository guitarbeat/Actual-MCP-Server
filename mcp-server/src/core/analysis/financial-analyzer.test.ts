
import { describe, it, vi, expect, afterEach } from 'vitest';
import { findUncategorizedTransactions } from './financial-analyzer';
import * as actualClient from '../api/actual-client';

// Mock the API client
vi.mock('../api/actual-client', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getBudgetMonth: vi.fn(),
  getAccountBalance: vi.fn(),
  getSchedules: vi.fn(),
}));

describe('Financial Analyzer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findUncategorizedTransactions', () => {
    it('should correctly aggregate uncategorized transactions from multiple accounts', async () => {
      // Mock accounts
      vi.mocked(actualClient.getAccounts).mockResolvedValue([
        { id: 'acc1', name: 'Account 1', closed: false, offbudget: false },
        { id: 'acc2', name: 'Account 2', closed: false, offbudget: false },
      ] as any);

      // Mock transactions
      vi.mocked(actualClient.getTransactions).mockImplementation(async (accountId) => {
        if (accountId === 'acc1') {
          return [
             { id: 'tx1', amount: -100, category: null, payee: 'Amazon' },
             { id: 'tx2', amount: -50, category: 'cat1', payee: 'Grocery' }, // Categorized
          ] as any;
        } else if (accountId === 'acc2') {
           return [
             { id: 'tx3', amount: -200, category: null, payee: 'Amazon' },
             { id: 'tx4', amount: -20, category: null, payee: 'Uber' },
          ] as any;
        }
        return [];
      });

      const result = await findUncategorizedTransactions('2024-01');

      expect(result.count).toBe(3); // tx1, tx3, tx4
      expect(result.totalAmount).toBe(320); // 100 + 200 + 20
      expect(result.topPayees).toHaveLength(2);
      expect(result.topPayees).toContain('Amazon');
      expect(result.topPayees).toContain('Uber');
      // Amazon has 2, Uber has 1, so Amazon should be first
      expect(result.topPayees[0]).toBe('Amazon');

      // Verification of parallel calls is hard to assert without time measurement,
      // but we verified it with the benchmark.
      expect(actualClient.getTransactions).toHaveBeenCalledTimes(2);
    });

     it('should handle no accounts', async () => {
      vi.mocked(actualClient.getAccounts).mockResolvedValue([]);
      const result = await findUncategorizedTransactions('2024-01');
      expect(result.count).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.topPayees).toEqual([]);
    });

    it('should handle accounts with no transactions', async () => {
      vi.mocked(actualClient.getAccounts).mockResolvedValue([
         { id: 'acc1', name: 'Account 1', closed: false, offbudget: false },
      ] as any);
      vi.mocked(actualClient.getTransactions).mockResolvedValue([]);

      const result = await findUncategorizedTransactions('2024-01');
      expect(result.count).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });
});
