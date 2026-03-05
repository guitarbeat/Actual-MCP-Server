import { describe, it, vi, expect, afterEach } from 'vitest';
import { findUncategorizedTransactions } from './financial-analyzer.js';
import * as actualClient from '../api/actual-client.js';

// Mock the API client
vi.mock('../api/actual-client.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getBudgetMonth: vi.fn(),
  getAccountBalance: vi.fn(),
  getSchedules: vi.fn(),
  runAQL: vi.fn(),
}));

describe('Financial Analyzer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findUncategorizedTransactions', () => {
    it('should correctly aggregate uncategorized transactions using AQL', async () => {
      // Mock runAQL
      vi.mocked(actualClient.runAQL).mockResolvedValue({
        data: [
          { amount: -100, payee: { name: 'Amazon' } },
          { amount: -200, payee: { name: 'Amazon' } },
          { amount: -20, payee: { name: 'Uber' } },
        ],
      } as unknown as { data: any[] });

      const result = await findUncategorizedTransactions('2024-01');

      expect(result.count).toBe(3);
      expect(result.totalAmount).toBe(320);
      expect(result.topPayees).toHaveLength(2);
      expect(result.topPayees[0]).toBe('Amazon');
      expect(result.topPayees[1]).toBe('Uber');

      expect(actualClient.runAQL).toHaveBeenCalled();
    });

    it('should handle no transactions', async () => {
      vi.mocked(actualClient.runAQL).mockResolvedValue({ data: [] } as unknown as { data: any[] });
      const result = await findUncategorizedTransactions('2024-01');
      expect(result.count).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.topPayees).toEqual([]);
    });

    it('should handle transactions with missing payee name', async () => {
      vi.mocked(actualClient.runAQL).mockResolvedValue({
        data: [{ amount: -50, payee: null }],
      } as unknown as { data: any[] });

      const result = await findUncategorizedTransactions('2024-01');
      expect(result.count).toBe(1);
      expect(result.totalAmount).toBe(50);
      expect(result.topPayees).toContain('Unknown');
    });
  });
});
