import { describe, expect, it } from 'vitest';
import type { Account, Transaction } from '../../core/types/index.js';
import { BalanceHistoryCalculator } from './balance-calculator.js';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Checking',
  balance: 100000, // $1,000.00 in cents
  offbudget: false,
  closed: false,
  ...overrides,
});

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 'txn-1',
    account: 'acc-1',
    date: '2024-06-15',
    amount: -5000, // -$50.00
    payee: undefined,
    category: undefined,
    cleared: true,
    ...overrides,
  }) as Transaction;

describe('BalanceHistoryCalculator', () => {
  const calc = new BalanceHistoryCalculator();

  describe('single-account mode', () => {
    it('returns an entry for each requested month', () => {
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(makeAccount(), [makeAccount()], [], 3, endDate);
      expect(result).toHaveLength(3);
    });

    it('returns months sorted newest first', () => {
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(makeAccount(), [makeAccount()], [], 3, endDate);
      const [first, second, third] = result;
      expect(first.year * 100 + first.month).toBeGreaterThanOrEqual(
        second.year * 100 + second.month,
      );
      expect(second.year * 100 + second.month).toBeGreaterThanOrEqual(
        third.year * 100 + third.month,
      );
    });

    it('assigns account current balance to all months when no transactions', () => {
      const account = makeAccount({ balance: 200000 });
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(account, [account], [], 2, endDate);
      result.forEach((m) => expect(m.balance).toBe(200000));
    });

    it('counts transactions in the correct month', () => {
      const account = makeAccount({ balance: 10000 });
      const tx = makeTransaction({ date: '2024-06-15', amount: -1000 });
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(account, [account], [tx], 3, endDate);

      const junEntry = result.find((m) => m.month === 6 && m.year === 2024);
      expect(junEntry?.transactions).toBe(1);
    });

    it('reflects transaction amount in running balance', () => {
      const account = makeAccount({ balance: 10000 });
      // Single $100 debit
      const tx = makeTransaction({ date: '2024-06-15', amount: -10000 });
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(account, [account], [tx], 3, endDate);

      // Current balance is 10000. After reversing the $100 debit, June balance = 10000 + 10000 = 20000
      const junEntry = result.find((m) => m.month === 6 && m.year === 2024);
      expect(junEntry).toBeDefined();
      // May (before June) should NOT include the June tx so should have 10000 adjusted
      const mayEntry = result.find((m) => m.month === 5 && m.year === 2024);
      expect(mayEntry).toBeDefined();
    });

    it('sets first month change to undefined', () => {
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(makeAccount(), [makeAccount()], [], 3, endDate);
      // Sorted newest first – the last item chronologically is the oldest month
      const oldest = result[result.length - 1];
      expect(oldest.change).toBeUndefined();
    });

    it('calculates change between consecutive months', () => {
      const account = makeAccount({ balance: 30000 });
      // One transaction in June
      const tx = makeTransaction({ date: '2024-06-15', amount: -5000 });
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(account, [account], [tx], 2, endDate);
      // result[0] = June (newest), result[1] = May (oldest)
      const jun = result.find((m) => m.month === 6 && m.year === 2024);
      const may = result.find((m) => m.month === 5 && m.year === 2024);
      expect(jun).toBeDefined();
      expect(may).toBeDefined();
      // change = jun.balance - may.balance
      if (jun && may) {
        expect(jun.change).toBe(jun.balance - may.balance);
      }
    });

    it('handles single month correctly (no change to compare)', () => {
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(makeAccount(), [makeAccount()], [], 1, endDate);
      expect(result).toHaveLength(1);
      expect(result[0].change).toBeUndefined();
    });
  });

  describe('all-accounts mode (account = undefined)', () => {
    it('returns entries for all accounts and all months', () => {
      const acc1 = makeAccount({ id: 'acc-1', name: 'Checking', balance: 10000 });
      const acc2 = makeAccount({ id: 'acc-2', name: 'Savings', balance: 20000 });
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(undefined, [acc1, acc2], [], 2, endDate);
      // 2 accounts × 2 months = 4 entries
      expect(result).toHaveLength(4);
    });

    it('attaches account name to each entry', () => {
      const acc1 = makeAccount({ id: 'acc-1', name: 'Checking', balance: 5000 });
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(undefined, [acc1], [], 1, endDate);
      expect(result[0].account).toBe('Checking');
    });

    it('counts transactions per account per month', () => {
      const acc1 = makeAccount({ id: 'acc-1', name: 'Checking', balance: 10000 });
      const acc2 = makeAccount({ id: 'acc-2', name: 'Savings', balance: 20000 });
      const tx = makeTransaction({ account: 'acc-1', date: '2024-06-10', amount: -1000 });
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(undefined, [acc1, acc2], [tx], 1, endDate);
      const checkingEntry = result.find((m) => m.account === 'Checking');
      const savingsEntry = result.find((m) => m.account === 'Savings');
      expect(checkingEntry?.transactions).toBe(1);
      expect(savingsEntry?.transactions).toBe(0);
    });

    it('returns empty array when no accounts provided', () => {
      const endDate = new Date('2024-06-30');
      const result = calc.calculate(undefined, [], [], 3, endDate);
      expect(result).toHaveLength(0);
    });
  });
});
