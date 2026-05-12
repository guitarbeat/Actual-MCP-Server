import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionMapper } from './transaction-mapper.js';
import type { Transaction } from '../types/domain.js';
import { formatAmount, formatDate } from '../formatting/index.js';

// Mock the formatting utilities
vi.mock('../formatting/index.js', () => ({
  formatAmount: vi.fn(),
  formatDate: vi.fn(),
}));

describe('TransactionMapper', () => {
  let mapper: TransactionMapper;

  beforeEach(() => {
    mapper = new TransactionMapper();
    vi.clearAllMocks();

    // Set up default mock returns
    vi.mocked(formatDate).mockImplementation((date) => `FORMATTED_DATE_${date}`);
    vi.mocked(formatAmount).mockImplementation((amount) => `FORMATTED_AMOUNT_${amount}`);
  });

  describe('map', () => {
    it('returns an empty array when given an empty array', () => {
      expect(mapper.map([])).toEqual([]);
    });

    it('maps a fully populated transaction correctly, preferring name fields over ids', () => {
      const transactions: Transaction[] = [
        {
          id: 'tx_1',
          account: 'acct_1',
          date: '2023-01-01',
          amount: 1500,
          payee_name: 'Supermarket',
          payee: 'payee_id_1',
          category_name: 'Groceries',
          category: 'cat_id_1',
          notes: 'Weekly shopping',
        },
      ];

      const result = mapper.map(transactions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'tx_1',
        date: 'FORMATTED_DATE_2023-01-01',
        payee: 'Supermarket',
        category: 'Groceries',
        amount: 'FORMATTED_AMOUNT_1500',
        notes: 'Weekly shopping',
      });

      // Verify formatting utilities were called correctly
      expect(formatDate).toHaveBeenCalledWith('2023-01-01');
      expect(formatAmount).toHaveBeenCalledWith(1500);
    });

    it('falls back to raw payee and category ids if names are not present', () => {
      const transactions: Transaction[] = [
        {
          id: 'tx_2',
          account: 'acct_1',
          date: '2023-01-02',
          amount: -500,
          payee: 'payee_id_2',
          category: 'cat_id_2',
          notes: 'Some notes',
        },
      ];

      const result = mapper.map(transactions);

      expect(result[0]).toEqual({
        id: 'tx_2',
        date: 'FORMATTED_DATE_2023-01-02',
        payee: 'payee_id_2',
        category: 'cat_id_2',
        amount: 'FORMATTED_AMOUNT_-500',
        notes: 'Some notes',
      });
    });

    it('applies default fallbacks when payee, category, and notes are completely missing', () => {
      const transactions: Transaction[] = [
        {
          id: 'tx_3',
          account: 'acct_1',
          date: '2023-01-03',
          amount: 0,
        },
      ];

      const result = mapper.map(transactions);

      expect(result[0]).toEqual({
        id: 'tx_3',
        date: 'FORMATTED_DATE_2023-01-03',
        payee: '(No payee)',
        category: '(Uncategorized)',
        amount: 'FORMATTED_AMOUNT_0',
        notes: '',
      });
    });

    it('handles multiple transactions correctly', () => {
      const transactions: Transaction[] = [
        { id: 'tx_1', account: 'a1', date: 'd1', amount: 100 },
        { id: 'tx_2', account: 'a1', date: 'd2', amount: 200, payee_name: 'P1' },
      ];

      const result = mapper.map(transactions);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('tx_1');
      expect(result[1].id).toBe('tx_2');
      expect(result[1].payee).toBe('P1');
    });
  });
});
