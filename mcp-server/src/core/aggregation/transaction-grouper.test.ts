
import { describe, expect, it } from 'vitest';
import { TransactionGrouper } from './transaction-grouper.js';
import type { CategoryGroupInfo, Transaction } from '../types/domain.js';

describe('TransactionGrouper', () => {
  const grouper = new TransactionGrouper();

  const getCategoryName = (id: string) => {
    const names: Record<string, string> = {
      cat1: 'Food',
      cat2: 'Rent',
      cat3: 'Salary',
    };
    return names[id] || 'Unknown';
  };

  const getGroupInfo = (id: string): CategoryGroupInfo | undefined => {
    const groups: Record<string, CategoryGroupInfo> = {
      cat1: { id: 'g1', name: 'Living', isIncome: false, isSavingsOrInvestment: false },
      cat2: { id: 'g1', name: 'Living', isIncome: false, isSavingsOrInvestment: false },
      cat3: { id: 'g2', name: 'Income', isIncome: true, isSavingsOrInvestment: false },
    };
    return groups[id];
  };

  it('should group transactions by category and aggregate totals', () => {
    const transactions: Transaction[] = [
      { id: 't1', account: 'a1', date: '2023-01-01', amount: -5000, category: 'cat1' },
      { id: 't2', account: 'a1', date: '2023-01-02', amount: -2000, category: 'cat1' },
      { id: 't3', account: 'a1', date: '2023-01-03', amount: -10000, category: 'cat2' },
    ];

    const result = grouper.groupByCategory(transactions, getCategoryName, getGroupInfo, true);

    expect(Object.keys(result)).toHaveLength(2);

    // Check cat1
    expect(result['cat1']).toBeDefined();
    expect(result['cat1'].total).toBe(-7000);
    expect(result['cat1'].transactions).toBe(2);
    expect(result['cat1'].name).toBe('Food');
    expect(result['cat1'].group).toBe('Living');

    // Check cat2
    expect(result['cat2']).toBeDefined();
    expect(result['cat2'].total).toBe(-10000);
    expect(result['cat2'].transactions).toBe(1);
  });

  it('should exclude income categories when includeIncome is false', () => {
    const transactions: Transaction[] = [
      { id: 't1', account: 'a1', date: '2023-01-01', amount: -5000, category: 'cat1' },
      { id: 't2', account: 'a1', date: '2023-01-02', amount: 20000, category: 'cat3' }, // Salary
    ];

    const result = grouper.groupByCategory(transactions, getCategoryName, getGroupInfo, false);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['cat1']).toBeDefined();
    expect(result['cat3']).toBeUndefined();
  });

  it('should include income categories when includeIncome is true', () => {
    const transactions: Transaction[] = [
      { id: 't1', account: 'a1', date: '2023-01-01', amount: 20000, category: 'cat3' }, // Salary
    ];

    const result = grouper.groupByCategory(transactions, getCategoryName, getGroupInfo, true);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['cat3']).toBeDefined();
    expect(result['cat3'].total).toBe(20000);
  });

  it('should skip transactions without a category', () => {
    const transactions: Transaction[] = [
      { id: 't1', account: 'a1', date: '2023-01-01', amount: -5000, category: 'cat1' },
      { id: 't2', account: 'a1', date: '2023-01-02', amount: -1000 }, // No category
    ];

    const result = grouper.groupByCategory(transactions, getCategoryName, getGroupInfo, true);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['cat1'].transactions).toBe(1);
  });

  it('should handle unknown groups', () => {
    const transactions: Transaction[] = [
      { id: 't1', account: 'a1', date: '2023-01-01', amount: -500, category: 'unknown_cat' },
    ];

    const result = grouper.groupByCategory(transactions, getCategoryName, getGroupInfo, true);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['unknown_cat'].group).toBe('Unknown Group');
    expect(result['unknown_cat'].name).toBe('Unknown');
  });
});
