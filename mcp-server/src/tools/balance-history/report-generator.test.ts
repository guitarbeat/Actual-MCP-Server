import { describe, expect, it } from 'vitest';
import type { Account } from '../../core/types/index.js';
import type { MonthBalance } from './balance-calculator.js';
import { generateBalanceHistoryReport } from './report-generator.js';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Checking',
  balance: 100000,
  offbudget: false,
  closed: false,
  ...overrides,
});

const makeMonthBalance = (overrides: Partial<MonthBalance> = {}): MonthBalance => ({
  year: 2024,
  month: 6,
  balance: 100000,
  transactions: 3,
  change: 5000,
  ...overrides,
});

describe('generateBalanceHistoryReport', () => {
  it('includes title in output', () => {
    const result = generateBalanceHistoryReport(
      undefined,
      { start: '2024-01-01', end: '2024-06-30' },
      [],
    );
    expect(result).toContain('# Balance History');
  });

  it('includes period in output', () => {
    const result = generateBalanceHistoryReport(
      undefined,
      { start: '2024-01-01', end: '2024-06-30' },
      [],
    );
    expect(result).toContain('2024-01-01 to 2024-06-30');
  });

  it('includes account name when single-account mode', () => {
    const account = makeAccount({ name: 'My Checking' });
    const result = generateBalanceHistoryReport(
      account,
      { start: '2024-01-01', end: '2024-06-30' },
      [],
    );
    expect(result).toContain('My Checking');
  });

  it('renders warnings section when warnings provided', () => {
    const result = generateBalanceHistoryReport(
      undefined,
      { start: '2024-01-01', end: '2024-06-30' },
      [],
      ['Account X failed'],
    );
    expect(result).toContain('## Warnings');
    expect(result).toContain('Account X failed');
  });

  it('does not render warnings section when no warnings', () => {
    const result = generateBalanceHistoryReport(
      undefined,
      { start: '2024-01-01', end: '2024-06-30' },
      [],
    );
    expect(result).not.toContain('## Warnings');
  });

  it('renders single-account table headers', () => {
    const account = makeAccount();
    const result = generateBalanceHistoryReport(
      account,
      { start: '2024-01-01', end: '2024-06-30' },
      [],
    );
    expect(result).toContain('End of Month Balance');
    expect(result).toContain('Monthly Change');
    expect(result).toContain('Transactions');
    expect(result).not.toContain('Account |');
  });

  it('renders multi-account table headers when no account', () => {
    const result = generateBalanceHistoryReport(
      undefined,
      { start: '2024-01-01', end: '2024-06-30' },
      [],
    );
    expect(result).toContain('Account');
    expect(result).toContain('End of Month Balance');
  });

  it('renders month rows for single-account mode', () => {
    const account = makeAccount();
    const month = makeMonthBalance({
      year: 2024,
      month: 6,
      balance: 50000,
      transactions: 5,
      change: 1000,
    });
    const result = generateBalanceHistoryReport(
      account,
      { start: '2024-06-01', end: '2024-06-30' },
      [month],
    );
    expect(result).toContain('June 2024');
    expect(result).toContain('$500.00');
    expect(result).toContain('5');
  });

  it('renders N/A for change when change is undefined', () => {
    const account = makeAccount();
    const month = makeMonthBalance({ change: undefined });
    const result = generateBalanceHistoryReport(
      account,
      { start: '2024-06-01', end: '2024-06-30' },
      [month],
    );
    expect(result).toContain('N/A');
  });

  it('renders ↑ for positive change', () => {
    const account = makeAccount();
    const month = makeMonthBalance({ change: 10000 });
    const result = generateBalanceHistoryReport(
      account,
      { start: '2024-06-01', end: '2024-06-30' },
      [month],
    );
    expect(result).toContain('↑');
  });

  it('renders ↓ for negative change', () => {
    const account = makeAccount();
    const month = makeMonthBalance({ change: -10000 });
    const result = generateBalanceHistoryReport(
      account,
      { start: '2024-06-01', end: '2024-06-30' },
      [month],
    );
    expect(result).toContain('↓');
  });

  it('renders no direction indicator for zero change', () => {
    const account = makeAccount();
    const month = makeMonthBalance({ change: 0 });
    const result = generateBalanceHistoryReport(
      account,
      { start: '2024-06-01', end: '2024-06-30' },
      [month],
    );
    expect(result).not.toContain('↑');
    expect(result).not.toContain('↓');
  });

  it('renders account name in multi-account rows', () => {
    const month = makeMonthBalance({ account: 'Savings', change: 0 });
    const result = generateBalanceHistoryReport(
      undefined,
      { start: '2024-06-01', end: '2024-06-30' },
      [month],
    );
    expect(result).toContain('Savings');
  });

  it('falls back to "Unknown account" when account name is missing in multi-account mode', () => {
    const month = makeMonthBalance({ account: undefined, change: 0 });
    const result = generateBalanceHistoryReport(
      undefined,
      { start: '2024-06-01', end: '2024-06-30' },
      [month],
    );
    expect(result).toContain('Unknown account');
  });
});
