import { describe, expect, it } from 'vitest';
import type { MonthData, MonthlySummaryReportData } from '../../core/types/index.js';
import { generateMonthlySummaryReport } from './report-generator.js';

function makeReportData(
  overrides: Partial<MonthlySummaryReportData> = {},
): MonthlySummaryReportData {
  return {
    start: '2024-01-01',
    end: '2024-06-30',
    accountId: undefined,
    accountName: undefined,
    sortedMonths: [],
    avgIncome: 100000,
    avgExpenses: 60000,
    avgInvestments: 10000,
    avgTraditionalSavings: 30000,
    avgTotalSavings: 40000,
    avgTraditionalSavingsRate: 30,
    avgTotalSavingsRate: 40,
    ...overrides,
  };
}

function makeMonth(overrides: Partial<MonthData> = {}): MonthData {
  return {
    year: 2024,
    month: 6,
    income: 100000,
    expenses: 60000,
    investments: 10000,
    transactions: 5,
    ...overrides,
  };
}

describe('generateMonthlySummaryReport', () => {
  it('includes report title', () => {
    const result = generateMonthlySummaryReport(makeReportData());
    expect(result).toContain('# Monthly Financial Summary');
  });

  it('includes period', () => {
    const result = generateMonthlySummaryReport(
      makeReportData({ start: '2024-01-01', end: '2024-06-30' }),
    );
    expect(result).toContain('2024-01-01 to 2024-06-30');
  });

  it('shows "All on-budget accounts" when no accountId', () => {
    const result = generateMonthlySummaryReport(makeReportData({ accountId: undefined }));
    expect(result).toContain('All on-budget accounts');
  });

  it('shows account name when accountId and accountName are set', () => {
    const result = generateMonthlySummaryReport(
      makeReportData({ accountId: 'acc-1', accountName: 'Savings' }),
    );
    expect(result).toContain('Savings');
  });

  it('falls back to accountId when accountName is undefined', () => {
    const result = generateMonthlySummaryReport(
      makeReportData({ accountId: 'acc-fallback', accountName: undefined }),
    );
    expect(result).toContain('acc-fallback');
  });

  it('renders warnings section when warnings provided', () => {
    const result = generateMonthlySummaryReport(makeReportData(), ['Something failed']);
    expect(result).toContain('## Warnings');
    expect(result).toContain('Something failed');
  });

  it('does not render warnings section when no warnings', () => {
    const result = generateMonthlySummaryReport(makeReportData());
    expect(result).not.toContain('## Warnings');
  });

  it('includes Monthly Breakdown section', () => {
    const result = generateMonthlySummaryReport(makeReportData());
    expect(result).toContain('## Monthly Breakdown');
  });

  it('renders row for each month in sortedMonths', () => {
    const months = [makeMonth({ month: 6 }), makeMonth({ month: 7 })];
    const result = generateMonthlySummaryReport(makeReportData({ sortedMonths: months }));
    expect(result).toContain('June 2024');
    expect(result).toContain('July 2024');
  });

  it('shows N/A savings rate when month income is 0', () => {
    const months = [makeMonth({ income: 0, expenses: 0, investments: 0 })];
    const result = generateMonthlySummaryReport(makeReportData({ sortedMonths: months }));
    expect(result).toContain('N/A');
  });

  it('shows percentage savings rate when month income > 0', () => {
    const months = [makeMonth({ income: 100000, expenses: 60000, investments: 10000 })];
    const result = generateMonthlySummaryReport(makeReportData({ sortedMonths: months }));
    // totalSavings = (100000 - 60000 - 10000) + 10000 = 40000; rate = 40000/100000 = 40%
    expect(result).toContain('40.0%');
  });

  it('includes averages section', () => {
    const result = generateMonthlySummaryReport(makeReportData());
    expect(result).toContain('## Averages');
    expect(result).toContain('Average Monthly Income');
  });

  it('includes definitions section', () => {
    const result = generateMonthlySummaryReport(makeReportData());
    expect(result).toContain('## Definitions');
    expect(result).toContain('Traditional Savings');
  });
});
