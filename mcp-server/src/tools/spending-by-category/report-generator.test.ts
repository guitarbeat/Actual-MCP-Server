import { describe, expect, it } from 'vitest';
import type { GroupSpending } from '../../core/types/index.js';
import { SpendingByCategoryReportGenerator } from './report-generator.js';

function makeGroup(overrides: Partial<GroupSpending> = {}): GroupSpending {
  return {
    name: 'Food',
    total: 50000,
    categories: [
      { name: 'Groceries', group: 'Food', isIncome: false, total: 30000, transactions: 4 },
      { name: 'Restaurants', group: 'Food', isIncome: false, total: 20000, transactions: 2 },
    ],
    ...overrides,
  };
}

describe('SpendingByCategoryReportGenerator', () => {
  const generator = new SpendingByCategoryReportGenerator();
  const period = { start: '2024-01-01', end: '2024-06-30' };

  it('includes report title', () => {
    const result = generator.generate([], period, 'All accounts', false);
    expect(result).toContain('# Spending by Category');
  });

  it('includes period', () => {
    const result = generator.generate([], period, 'All accounts', false);
    expect(result).toContain('2024-01-01 to 2024-06-30');
  });

  it('includes account label', () => {
    const result = generator.generate([], period, 'Account: Checking', false);
    expect(result).toContain('Account: Checking');
  });

  it('shows income categories excluded when includeIncome is false', () => {
    const result = generator.generate([], period, 'All accounts', false);
    expect(result).toContain('Excluded');
  });

  it('shows income categories included when includeIncome is true', () => {
    const result = generator.generate([], period, 'All accounts', true);
    expect(result).toContain('Included');
  });

  it('renders warnings section when warnings provided', () => {
    const result = generator.generate([], period, 'All accounts', false, ['Account X failed']);
    expect(result).toContain('## Warnings');
    expect(result).toContain('Account X failed');
  });

  it('does not render warnings section when no warnings', () => {
    const result = generator.generate([], period, 'All accounts', false);
    expect(result).not.toContain('## Warnings');
  });

  it('renders group header and total', () => {
    const result = generator.generate([makeGroup()], period, 'All accounts', false);
    expect(result).toContain('## Food');
    expect(result).toContain('$500.00');
  });

  it('renders category rows', () => {
    const result = generator.generate([makeGroup()], period, 'All accounts', false);
    expect(result).toContain('Groceries');
    expect(result).toContain('Restaurants');
  });

  it('renders category transaction counts', () => {
    const result = generator.generate([makeGroup()], period, 'All accounts', false);
    expect(result).toContain('4');
    expect(result).toContain('2');
  });

  it('renders multiple groups', () => {
    const groups = [makeGroup({ name: 'Food' }), makeGroup({ name: 'Transport' })];
    const result = generator.generate(groups, period, 'All accounts', false);
    expect(result).toContain('## Food');
    expect(result).toContain('## Transport');
  });

  it('renders empty report with no groups', () => {
    const result = generator.generate([], period, 'All accounts', false);
    expect(result).toContain('# Spending by Category');
    expect(result).not.toContain('##');
  });
});
