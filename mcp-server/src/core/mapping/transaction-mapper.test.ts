import { describe, it, expect } from 'vitest';
import { TransactionMapper } from './transaction-mapper.js';
import type { Transaction } from '../types/domain.js';

describe('TransactionMapper', () => {
  const mapper = new TransactionMapper();

  it('maps a fully populated transaction correctly', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        account: 'a1',
        date: '2023-10-01',
        amount: 1500,
        payee: 'p1',
        payee_name: 'Target',
        category: 'c1',
        category_name: 'Groceries',
        notes: 'Weekly shopping',
      },
    ];

    const result = mapper.map(transactions);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 't1',
      date: '2023-10-01',
      payee: 'Target',
      category: 'Groceries',
      amount: '$15.00',
      notes: 'Weekly shopping',
    });
  });

  it('falls back to payee id if payee_name is missing', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        account: 'a1',
        date: '2023-10-01',
        amount: 1500,
        payee: 'p1',
      },
    ];

    const result = mapper.map(transactions);

    expect(result[0].payee).toBe('p1');
  });

  it('falls back to (No payee) if neither payee_name nor payee id is provided', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        account: 'a1',
        date: '2023-10-01',
        amount: 1500,
      },
    ];

    const result = mapper.map(transactions);

    expect(result[0].payee).toBe('(No payee)');
  });

  it('falls back to category id if category_name is missing', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        account: 'a1',
        date: '2023-10-01',
        amount: 1500,
        category: 'c1',
      },
    ];

    const result = mapper.map(transactions);

    expect(result[0].category).toBe('c1');
  });

  it('falls back to (Uncategorized) if neither category_name nor category id is provided', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        account: 'a1',
        date: '2023-10-01',
        amount: 1500,
      },
    ];

    const result = mapper.map(transactions);

    expect(result[0].category).toBe('(Uncategorized)');
  });

  it('falls back to an empty string for missing notes', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        account: 'a1',
        date: '2023-10-01',
        amount: 1500,
      },
    ];

    const result = mapper.map(transactions);

    expect(result[0].notes).toBe('');
  });

  it('correctly formats zero amounts', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        account: 'a1',
        date: '2023-10-01',
        amount: 0,
      },
    ];

    const result = mapper.map(transactions);

    expect(result[0].amount).toBe('$0.00');
  });

  it('correctly formats negative amounts', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        account: 'a1',
        date: '2023-10-01',
        amount: -1500,
      },
    ];

    const result = mapper.map(transactions);

    expect(result[0].amount).toBe('-$15.00');
  });

  it('maps an array of multiple transactions', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        account: 'a1',
        date: '2023-10-01',
        amount: 1500,
      },
      {
        id: 't2',
        account: 'a2',
        date: '2023-10-02',
        amount: -2050,
      },
    ];

    const result = mapper.map(transactions);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('t1');
    expect(result[1].id).toBe('t2');
  });
});
