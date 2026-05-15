import { describe, it, expect } from 'vitest';
import {
  filterTransactions,
  buildAppliedFilters,
  sortTransactionsNewestFirst,
  generateAccountSummary,
} from './transaction-utils.js';
import type { Transaction } from '../../core/types/domain.js';

describe('transaction-utils', () => {
  describe('filterTransactions', () => {
    const mockTx: Transaction[] = [
      {
        id: '1',
        amount: 1500, // $15
        date: '2024-03-20',
        payee: 'Amazon',
        payee_name: 'Amazon.com',
        category: 'cat1',
        category_name: 'Shopping',
        account: 'acc1',
        account_name: 'Checking',
      } as Transaction,
      {
        id: '2',
        amount: 5000, // $50
        date: '2024-03-21',
        payee: 'Walmart',
        payee_name: 'Walmart',
        category: null as unknown as string,
        category_name: null as unknown as string,
        account: 'acc2',
        account_name: 'Savings',
      } as Transaction,
      {
        id: '3',
        amount: 10000, // $100
        date: '2024-03-22',
        payee: 'Transfer',
        payee_name: 'Transfer',
        category: 'cat2',
        category_name: 'Transfer',
        account: 'acc1',
        account_name: 'Checking',
        is_parent: false,
        is_child: false,
        transfer_id: 'tx_transfer_1',
      } as unknown as Transaction,
    ];

    it('should filter by minAmount', () => {
      const result = filterTransactions(mockTx, { minAmount: 20 });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(['2', '3']);
    });

    it('should filter by maxAmount', () => {
      const result = filterTransactions(mockTx, { maxAmount: 20 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by payeeName (case insensitive)', () => {
      const result = filterTransactions(mockTx, { payeeName: 'amazon' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by categoryName (case insensitive)', () => {
      const result = filterTransactions(mockTx, { categoryName: 'shopping' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by uncategorized', () => {
      const result = filterTransactions(mockTx, { categoryName: 'uncategorized' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should filter out transfers', () => {
      const result = filterTransactions(mockTx, { excludeTransfers: true });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(['1', '2']);
    });
  });

  describe('buildAppliedFilters', () => {
    it('should format filters correctly', () => {
      const result = buildAppliedFilters({
        minAmount: 10.5,
        maxAmount: 100,
        categoryName: 'Food',
        payeeName: 'Grocery',
      });
      expect(result).toEqual([
        'Minimum amount: $10.50',
        'Maximum amount: $100.00',
        'Category contains: "Food"',
        'Payee contains: "Grocery"',
      ]);
    });

    it('should handle empty criteria', () => {
      const result = buildAppliedFilters({});
      expect(result).toEqual([]);
    });
  });

  describe('sortTransactionsNewestFirst', () => {
    it('should sort by date descending, then id ascending', () => {
      const mockTx: Transaction[] = [
        { id: '1', date: '2024-03-21' } as Transaction,
        { id: '2', date: '2024-03-20' } as Transaction,
        { id: '3', date: '2024-03-21' } as Transaction,
      ];
      // When sorted, the dates descending puts 2024-03-21 first.
      // id '3' should come before '1' if sorting descending (localeCompare with right.id compared to left.id in string order)
      const result = sortTransactionsNewestFirst(mockTx);
      expect(result.map((t) => t.id)).toEqual(['1', '3', '2']);
    });
  });

  describe('generateAccountSummary', () => {
    it('should count transactions by account name and sort descending', () => {
      const mockTx: Transaction[] = [
        { account_name: 'Checking' } as Transaction,
        { account_name: 'Savings' } as Transaction,
        { account_name: 'Checking' } as Transaction,
        { account_name: 'Savings' } as Transaction,
        { account_name: 'Checking' } as Transaction,
        { account: 'Fallback' } as Transaction,
      ];
      const result = generateAccountSummary(mockTx);
      expect(result).toEqual([
        { accountName: 'Checking', count: 3 },
        { accountName: 'Savings', count: 2 },
        { accountName: 'Fallback', count: 1 },
      ]);
    });

    it('should use Unknown if account missing', () => {
      const mockTx: Transaction[] = [{} as Transaction];
      const result = generateAccountSummary(mockTx);
      expect(result).toEqual([{ accountName: 'Unknown', count: 1 }]);
    });
  });
});
