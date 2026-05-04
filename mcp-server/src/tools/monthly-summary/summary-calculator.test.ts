import { describe, expect, it } from 'vitest';
import { MonthlySummaryCalculator } from './summary-calculator.js';

describe('MonthlySummaryCalculator', () => {
  const calc = new MonthlySummaryCalculator();

  const makeMonth = (income: number, expenses: number, investments: number) => ({
    year: 2024,
    month: 1,
    income,
    expenses,
    investments,
    transactions: 0,
  });

  it('returns all zeros when given an empty array', () => {
    const result = calc.calculateAverages([]);
    expect(result.avgIncome).toBe(0);
    expect(result.avgExpenses).toBe(0);
    expect(result.avgInvestments).toBe(0);
    expect(result.avgTraditionalSavings).toBe(0);
    expect(result.avgTotalSavings).toBe(0);
    expect(result.avgTraditionalSavingsRate).toBe(0);
    expect(result.avgTotalSavingsRate).toBe(0);
  });

  it('computes averages correctly for a single month', () => {
    const months = [makeMonth(100000, 40000, 10000)];
    const result = calc.calculateAverages(months);
    expect(result.avgIncome).toBe(100000);
    expect(result.avgExpenses).toBe(40000);
    expect(result.avgInvestments).toBe(10000);
    // Traditional savings = 100000 - 40000 - 10000 = 50000
    expect(result.avgTraditionalSavings).toBe(50000);
    // Total savings = 50000 + 10000 = 60000
    expect(result.avgTotalSavings).toBe(60000);
    expect(result.avgTraditionalSavingsRate).toBeCloseTo(50, 1);
    expect(result.avgTotalSavingsRate).toBeCloseTo(60, 1);
  });

  it('averages across multiple months', () => {
    const months = [makeMonth(100000, 40000, 10000), makeMonth(80000, 30000, 5000)];
    const result = calc.calculateAverages(months);
    expect(result.avgIncome).toBe(90000);
    expect(result.avgExpenses).toBe(35000);
    expect(result.avgInvestments).toBe(7500);
  });

  it('returns 0 savings rate when avgIncome is 0', () => {
    const months = [makeMonth(0, 0, 0)];
    const result = calc.calculateAverages(months);
    expect(result.avgTraditionalSavingsRate).toBe(0);
    expect(result.avgTotalSavingsRate).toBe(0);
  });
});
