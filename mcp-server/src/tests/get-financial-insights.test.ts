import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from '../tools/financial-insights/index.js';
import * as financialAnalyzer from '../core/analysis/financial-analyzer.js';

vi.mock('../core/analysis/financial-analyzer.js', () => ({
  generateInsightsSummary: vi.fn().mockResolvedValue({
    summary: 'Mock summary',
    month: '2024-05',
    partial: false,
    warnings: [],
    overspending: [
      { groupName: 'Group', categoryName: 'Cat', budgeted: 100, spent: -200, overage: 100 }
    ],
    uncategorized: {
      count: 2,
      totalAmount: 1500,
      topPayees: ['Payee 1', 'Payee 2']
    },
    accountHealth: [
      { name: 'Checking', balance: -5000, status: 'negative' },
      { name: 'Savings', balance: 100000, status: 'healthy' }
    ],
    upcomingSchedules: [
      { name: 'Rent', amount: -150000, nextDate: '2024-05-15' }
    ],
    trends: {
      currentMonthSpending: -50000,
      previousMonthSpending: -40000,
      spendingChange: 25,
      savingsRate: 10
    }
  })
}));

describe('get-financial-insights tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have the correct name', () => {
      expect(schema.name).toBe('get-financial-insights');
    });
  });

  describe('handler', () => {
    it('should format insights and return a successful JSON response', async () => {
      const args = { month: '2024-05' };

      const result = await handler(args);

      expect(financialAnalyzer.generateInsightsSummary).toHaveBeenCalledWith('2024-05', {
        includeSchedules: undefined,
        scheduleDays: undefined
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse(result.content[0].text);
      expect(content.month).toBe('2024-05');
      expect(content.summary).toBe('Mock summary');
      expect(content.overspending).toBeDefined();
      expect(content.uncategorized.count).toBe(2);
      expect(content.accountHealth).toHaveLength(1); // Only non-healthy accounts
      expect(content.accountHealth[0].status).toBe('negative');
      expect(content.upcomingSchedules).toHaveLength(1);
      expect(content.trends.change).toBe('+25.0%');
    });

    it('should reject invalid month format', async () => {
      const args = { month: '2024-5' }; // Invalid format

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(financialAnalyzer.generateInsightsSummary).not.toHaveBeenCalled();
    });
  });
});
