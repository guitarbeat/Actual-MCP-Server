import { describe, expect, it } from 'vitest';
import type { Transaction } from '../types/index.js';
import { TransactionMapper } from './transaction-mapper.js';

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 'txn-1',
    account: 'acc-1',
    date: '2024-06-15',
    amount: -5000,
    payee: 'payee-1',
    category: 'cat-1',
    cleared: true,
    payee_name: undefined,
    category_name: undefined,
    notes: undefined,
    ...overrides,
  }) as Transaction;

describe('TransactionMapper', () => {
  const mapper = new TransactionMapper();

  it('maps empty array to empty array', () => {
    expect(mapper.map([])).toEqual([]);
  });

  it('formats amount in dollars', () => {
    const result = mapper.map([makeTransaction({ amount: -5000 })]);
    expect(result[0].amount).toBe('-$50.00');
  });

  it('formats date', () => {
    const result = mapper.map([makeTransaction({ date: '2024-06-15' })]);
    // formatDate should produce a non-empty string in MM/DD/YYYY or similar
    expect(result[0].date).toBeTruthy();
  });

  it('uses payee_name when available', () => {
    const result = mapper.map([makeTransaction({ payee_name: 'Amazon', payee: 'payee-1' })]);
    expect(result[0].payee).toBe('Amazon');
  });

  it('falls back to payee id when payee_name is absent', () => {
    const result = mapper.map([makeTransaction({ payee_name: undefined, payee: 'payee-raw' })]);
    expect(result[0].payee).toBe('payee-raw');
  });

  it('shows (No payee) when both payee_name and payee are absent', () => {
    const result = mapper.map([makeTransaction({ payee_name: undefined, payee: undefined })]);
    expect(result[0].payee).toBe('(No payee)');
  });

  it('uses category_name when available', () => {
    const result = mapper.map([makeTransaction({ category_name: 'Groceries', category: 'cat-1' })]);
    expect(result[0].category).toBe('Groceries');
  });

  it('falls back to category id when category_name is absent', () => {
    const result = mapper.map([makeTransaction({ category_name: undefined, category: 'cat-raw' })]);
    expect(result[0].category).toBe('cat-raw');
  });

  it('shows (Uncategorized) when both category_name and category are absent', () => {
    const result = mapper.map([makeTransaction({ category_name: undefined, category: undefined })]);
    expect(result[0].category).toBe('(Uncategorized)');
  });

  it('uses notes when available', () => {
    const result = mapper.map([makeTransaction({ notes: 'Some note' })]);
    expect(result[0].notes).toBe('Some note');
  });

  it('returns empty string for notes when absent', () => {
    const result = mapper.map([makeTransaction({ notes: undefined })]);
    expect(result[0].notes).toBe('');
  });

  it('preserves transaction id', () => {
    const result = mapper.map([makeTransaction({ id: 'my-id' })]);
    expect(result[0].id).toBe('my-id');
  });

  it('maps multiple transactions', () => {
    const txns = [makeTransaction({ id: 'txn-a' }), makeTransaction({ id: 'txn-b' })];
    const result = mapper.map(txns);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('txn-a');
    expect(result[1].id).toBe('txn-b');
  });
});
