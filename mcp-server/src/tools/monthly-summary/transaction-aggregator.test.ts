import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../core/types/index.js';
import { MonthlySummaryTransactionAggregator } from './transaction-aggregator.js';

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 'txn-1',
    account: 'acc-1',
    date: '2024-06-15',
    amount: -5000,
    payee: undefined,
    category: undefined,
    cleared: true,
    ...overrides,
  }) as Transaction;

describe('MonthlySummaryTransactionAggregator', () => {
  const aggregator = new MonthlySummaryTransactionAggregator();
  const noCategories = new Set<string>();

  it('returns empty array for no transactions', () => {
    const result = aggregator.aggregate([], noCategories, noCategories);
    expect(result).toHaveLength(0);
  });

  it('skips transfer transactions with no category', () => {
    const tx = makeTransaction({ transfer_id: 'transfer-abc', category: undefined });
    const result = aggregator.aggregate([tx], noCategories, noCategories);
    expect(result).toHaveLength(0);
  });

  it('does not skip transfer transactions that have a category', () => {
    const tx = makeTransaction({ transfer_id: 'transfer-abc', category: 'cat-1', amount: -5000 });
    const result = aggregator.aggregate([tx], noCategories, noCategories);
    expect(result).toHaveLength(1);
  });

  it('groups transactions by year-month', () => {
    const tx1 = makeTransaction({ date: '2024-06-01', amount: -1000 });
    const tx2 = makeTransaction({ date: '2024-06-15', amount: -2000 });
    const tx3 = makeTransaction({ date: '2024-07-10', amount: -3000 });
    const result = aggregator.aggregate([tx1, tx2, tx3], noCategories, noCategories);
    expect(result).toHaveLength(2);
  });

  it('treats positive amount transactions as income', () => {
    const tx = makeTransaction({ date: '2024-06-01', amount: 50000 });
    const result = aggregator.aggregate([tx], noCategories, noCategories);
    const jun = result.find((m) => m.month === 6);
    expect(jun?.income).toBe(50000);
    expect(jun?.expenses).toBe(0);
  });

  it('classifies category-tagged income transactions as income', () => {
    const incomeCategories = new Set(['cat-income']);
    const tx = makeTransaction({ date: '2024-06-01', amount: -100, category: 'cat-income' });
    const result = aggregator.aggregate([tx], incomeCategories, noCategories);
    const jun = result.find((m) => m.month === 6);
    expect(jun?.income).toBe(100);
    expect(jun?.expenses).toBe(0);
  });

  it('classifies investment categories as investments', () => {
    const investmentCategories = new Set(['cat-invest']);
    const tx = makeTransaction({ date: '2024-06-01', amount: -20000, category: 'cat-invest' });
    const result = aggregator.aggregate([tx], noCategories, investmentCategories);
    const jun = result.find((m) => m.month === 6);
    expect(jun?.investments).toBe(20000);
    expect(jun?.expenses).toBe(0);
  });

  it('classifies uncategorized negative amount transactions as expenses', () => {
    const tx = makeTransaction({ date: '2024-06-01', amount: -3000 });
    const result = aggregator.aggregate([tx], noCategories, noCategories);
    const jun = result.find((m) => m.month === 6);
    expect(jun?.expenses).toBe(3000);
    expect(jun?.income).toBe(0);
  });

  it('returns months sorted ascending by year then month', () => {
    const tx1 = makeTransaction({ date: '2024-08-01', amount: -1000 });
    const tx2 = makeTransaction({ date: '2024-06-01', amount: -1000 });
    const tx3 = makeTransaction({ date: '2024-07-01', amount: -1000 });
    const result = aggregator.aggregate([tx1, tx2, tx3], noCategories, noCategories);
    expect(result[0].month).toBe(6);
    expect(result[1].month).toBe(7);
    expect(result[2].month).toBe(8);
  });

  it('counts transactions per month correctly', () => {
    const txs = [
      makeTransaction({ date: '2024-06-01', amount: -100 }),
      makeTransaction({ date: '2024-06-15', amount: -200 }),
    ];
    const result = aggregator.aggregate(txs, noCategories, noCategories);
    expect(result[0].transactions).toBe(2);
  });
});
