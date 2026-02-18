import { describe, expect, it, vi } from 'vitest';
import type { CategoryGroupInfo, Transaction } from '../types/domain.js';
import { TransactionGrouper } from './transaction-grouper.js';

describe('TransactionGrouper', () => {
  const grouper = new TransactionGrouper();

  const transactions: Transaction[] = [
    { id: 't1', account: 'a1', date: '2023-01-01', amount: -100, category: 'cat1' }, // Food
    { id: 't2', account: 'a1', date: '2023-01-02', amount: -200, category: 'cat1' }, // Food
    { id: 't3', account: 'a1', date: '2023-01-03', amount: 500, category: 'cat2' }, // Salary (Income)
    { id: 't4', account: 'a1', date: '2023-01-04', amount: -50, category: 'cat3' }, // Uncategorized group
    { id: 't5', account: 'a1', date: '2023-01-05', amount: -100, category: undefined }, // No category
  ];

  const getCategoryName = (id: string) => {
    if (id === 'cat1') return 'Food';
    if (id === 'cat2') return 'Salary';
    if (id === 'cat3') return 'Misc';
    return 'Unknown';
  };

  const getGroupInfo = (id: string): CategoryGroupInfo | undefined => {
    if (id === 'cat1')
      return { id: 'g1', name: 'Living', isIncome: false, isSavingsOrInvestment: false };
    if (id === 'cat2')
      return { id: 'g2', name: 'Income', isIncome: true, isSavingsOrInvestment: false };
    if (id === 'cat3') return undefined;
    return undefined;
  };

  it('should group transactions and calculate totals correctly', () => {
    // Should include everything except income if includeIncome is false (default behavior logic test)
    // Wait, the param is includeIncome.

    const result = grouper.groupByCategory(transactions, getCategoryName, getGroupInfo, false);

    expect(result.cat1).toBeDefined();
    expect(result.cat1.total).toBe(-300); // -100 + -200
    expect(result.cat1.transactions).toBe(2);
    expect(result.cat1.name).toBe('Food');
    expect(result.cat1.group).toBe('Living');

    // cat2 is Income, should be skipped
    expect(result.cat2).toBeUndefined();

    // cat3 has no group info, defaults to Unknown Group, isIncome: false. Should be included.
    expect(result.cat3).toBeDefined();
    expect(result.cat3.group).toBe('Unknown Group');

    // t5 has no category, should be skipped
    expect(Object.keys(result)).not.toContain('undefined');
  });

  it('should include income when requested', () => {
    const result = grouper.groupByCategory(transactions, getCategoryName, getGroupInfo, true);

    expect(result.cat2).toBeDefined();
    expect(result.cat2.total).toBe(500);
    expect(result.cat2.group).toBe('Income');
  });

  it('should optimize lookups', () => {
    const getCategoryNameSpy = vi.fn(getCategoryName);
    const getGroupInfoSpy = vi.fn(getGroupInfo);

    // Run with duplicates to test caching/skipping
    const manyTransactions = [
      ...transactions,
      ...transactions, // duplicates
      { id: 't6', account: 'a1', date: '2023-01-06', amount: -50, category: 'cat1' }, // another cat1
    ];

    grouper.groupByCategory(manyTransactions, getCategoryNameSpy, getGroupInfoSpy, false);

    // cat1 appears multiple times.
    // It should be looked up ONCE.
    // cat2 appears multiple times. It is income (skipped).
    // It should be looked up ONCE (to determine it is income), then added to skippedCategories.

    // Check calls for 'cat1'
    const cat1Calls = getCategoryNameSpy.mock.calls.filter((args) => args[0] === 'cat1');
    expect(cat1Calls.length).toBe(1);

    const cat1GroupCalls = getGroupInfoSpy.mock.calls.filter((args) => args[0] === 'cat1');
    expect(cat1GroupCalls.length).toBe(1);

    // Check calls for 'cat2' (Income, skipped)
    const cat2GroupCalls = getGroupInfoSpy.mock.calls.filter((args) => args[0] === 'cat2');
    expect(cat2GroupCalls.length).toBe(1);

    // cat2 shouldn't even call getCategoryName because we skip it after checking group info
    const cat2NameCalls = getCategoryNameSpy.mock.calls.filter((args) => args[0] === 'cat2');
    expect(cat2NameCalls.length).toBe(0);
  });
});
