import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionMapper } from './transaction-mapper.js';
import type { Transaction } from '../types/domain.js';

// Mock formatting functions
vi.mock('../formatting/index.js', () => ({
  formatDate: vi.fn((date) => `formatted-${date}`),
  formatAmount: vi.fn((amount) => `formatted-${amount}`),
}));

describe('TransactionMapper', () => {
  let mapper: TransactionMapper;

  beforeEach(() => {
    vi.clearAllMocks();
    mapper = new TransactionMapper();
  });

  describe('map', () => {
    it('maps an empty array to an empty array', () => {
      const result = mapper.map([]);
      expect(result).toEqual([]);
    });

    it('maps a fully populated transaction correctly', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          account: 'a1',
          date: '2023-01-01',
          amount: 1000,
          payee_name: 'Target',
          category_name: 'Groceries',
          notes: 'Weekly groceries',
        },
      ];

      const result = mapper.map(transactions);

      expect(result).toEqual([
        {
          id: 't1',
          date: 'formatted-2023-01-01',
          payee: 'Target',
          category: 'Groceries',
          amount: 'formatted-1000',
          notes: 'Weekly groceries',
        },
      ]);
    });

    it('handles a transaction with a 0 amount properly', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          account: 'a1',
          date: '2023-01-01',
          amount: 0,
        },
      ];

      const result = mapper.map(transactions);

      expect(result[0].amount).toBe('formatted-0');
    });

    it('falls back to payee id/string if payee_name is missing', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          account: 'a1',
          date: '2023-01-01',
          amount: 1000,
          payee: 'p1', // payee id instead of name
        },
      ];

      const result = mapper.map(transactions);

      expect(result[0].payee).toBe('p1');
    });

    it('falls back to "(No payee)" if both payee_name and payee are missing', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          account: 'a1',
          date: '2023-01-01',
          amount: 1000,
          payee: null,
        },
      ];

      const result = mapper.map(transactions);

      expect(result[0].payee).toBe('(No payee)');
    });

    it('falls back to category id/string if category_name is missing', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          account: 'a1',
          date: '2023-01-01',
          amount: 1000,
          category: 'c1', // category id instead of name
        },
      ];

      const result = mapper.map(transactions);

      expect(result[0].category).toBe('c1');
    });

    it('falls back to "(Uncategorized)" if both category_name and category are missing', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          account: 'a1',
          date: '2023-01-01',
          amount: 1000,
          category: null,
        },
      ];

      const result = mapper.map(transactions);

      expect(result[0].category).toBe('(Uncategorized)');
    });

    it('falls back to empty string if notes are missing or null', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          account: 'a1',
          date: '2023-01-01',
          amount: 1000,
        },
        {
          id: 't2',
          account: 'a1',
          date: '2023-01-02',
          amount: 2000,
          notes: null,
        },
      ];

      const result = mapper.map(transactions);

      expect(result[0].notes).toBe('');
      expect(result[1].notes).toBe('');
    });
  });
});
