
import { describe, it, expect, vi } from 'vitest';
import { handler } from './index.js';
import * as financialAnalyzer from '../../core/analysis/financial-analyzer.js';

// Mock the analysis module
vi.mock('../../core/analysis/financial-analyzer.js', () => ({
  generateInsightsSummary: vi.fn().mockResolvedValue({
    summary: 'Mock Summary',
    month: '2024-01',
    overspending: [],
    uncategorized: { count: 0, totalAmount: 0, topPayees: [] },
    accountHealth: [],
    upcomingSchedules: [],
    trends: {
      currentMonthSpending: 0,
      previousMonthSpending: 0,
      spendingChange: 0,
      savingsRate: 0
    }
  })
}));

describe('financial-insights tool', () => {
  it('should reject invalid month format', async () => {
    // This input should now fail validation
    const invalidMonth = "2024-01' OR 1=1 --";
    const result = await handler({ month: invalidMonth });

    // Check that it returns an error response
    expect(result).toHaveProperty('isError', true);
    // @ts-expect-error - we know it's an error response
    expect(result.content[0].text).toContain('Validation error');
    // @ts-expect-error - we know it's an error response
    expect(result.content[0].text).toContain('Month must be in YYYY-MM format');

    // Ensure the vulnerable function was NOT called with the invalid input
    expect(financialAnalyzer.generateInsightsSummary).not.toHaveBeenCalledWith(invalidMonth, expect.any(Object));
  });

  it('should accept valid month format', async () => {
    const validMonth = "2024-01";
    const result = await handler({ month: validMonth });

    expect(result).not.toHaveProperty('isError', true);
    expect(financialAnalyzer.generateInsightsSummary).toHaveBeenCalledWith(validMonth, expect.any(Object));
  });

  it('should use default values for optional params', async () => {
    await handler({});
    // The schema defines defaults, but .parse() fills them in only if we use the returned object.
    // The handler uses validated object.
    expect(financialAnalyzer.generateInsightsSummary).toHaveBeenCalledWith(undefined, {
      includeSchedules: true,
      scheduleDays: 14
    });
  });
});
