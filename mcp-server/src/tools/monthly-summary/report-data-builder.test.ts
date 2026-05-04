import { describe, expect, it } from 'vitest';
import type { Account } from '../../core/types/index.js';
import { MonthlySummaryReportDataBuilder } from './report-data-builder.js';

const makeAccount = (id: string, name: string): Account => ({
  id,
  name,
  balance: 0,
  offbudget: false,
  closed: false,
});

describe('MonthlySummaryReportDataBuilder', () => {
  const builder = new MonthlySummaryReportDataBuilder();

  const baseAverages = {
    avgIncome: 100000,
    avgExpenses: 60000,
    avgInvestments: 10000,
    avgTraditionalSavings: 30000,
    avgTotalSavings: 40000,
    avgTraditionalSavingsRate: 30,
    avgTotalSavingsRate: 40,
  };

  it('passes through start, end and sortedMonths', () => {
    const months = [
      { year: 2024, month: 6, income: 0, expenses: 0, investments: 0, transactions: 0 },
    ];
    const result = builder.build({
      start: '2024-01-01',
      end: '2024-06-30',
      accountId: undefined,
      accounts: [],
      sortedMonths: months,
      averages: baseAverages,
    });
    expect(result.start).toBe('2024-01-01');
    expect(result.end).toBe('2024-06-30');
    expect(result.sortedMonths).toBe(months);
  });

  it('resolves accountName from accounts list when accountId is given', () => {
    const accounts = [makeAccount('acc-1', 'Checking'), makeAccount('acc-2', 'Savings')];
    const result = builder.build({
      start: '2024-01-01',
      end: '2024-06-30',
      accountId: 'acc-2',
      accounts,
      sortedMonths: [],
      averages: baseAverages,
    });
    expect(result.accountId).toBe('acc-2');
    expect(result.accountName).toBe('Savings');
  });

  it('returns undefined accountName when accountId is undefined', () => {
    const result = builder.build({
      start: '2024-01-01',
      end: '2024-06-30',
      accountId: undefined,
      accounts: [makeAccount('acc-1', 'Checking')],
      sortedMonths: [],
      averages: baseAverages,
    });
    expect(result.accountName).toBeUndefined();
    expect(result.accountId).toBeUndefined();
  });

  it('returns undefined accountName when accountId not found in accounts list', () => {
    const result = builder.build({
      start: '2024-01-01',
      end: '2024-06-30',
      accountId: 'missing-id',
      accounts: [makeAccount('acc-1', 'Checking')],
      sortedMonths: [],
      averages: baseAverages,
    });
    expect(result.accountName).toBeUndefined();
  });

  it('spreads averages into result', () => {
    const result = builder.build({
      start: '2024-01-01',
      end: '2024-06-30',
      accountId: undefined,
      accounts: [],
      sortedMonths: [],
      averages: baseAverages,
    });
    expect(result.avgIncome).toBe(100000);
    expect(result.avgExpenses).toBe(60000);
    expect(result.avgTraditionalSavingsRate).toBe(30);
  });
});
