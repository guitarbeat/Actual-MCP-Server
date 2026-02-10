import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';
import * as analyzer from '../../core/analysis/financial-analyzer.js';

// Mock the analyzer module
vi.mock('../../core/analysis/financial-analyzer.js', () => ({
  generateInsightsSummary: vi.fn().mockResolvedValue({
    summary: 'Mock Summary',
    month: '2024-01',
    overspending: [],
    uncategorized: { count: 0, totalAmount: 0, topPayees: [] },
    accountHealth: [],
    upcomingSchedules: [],
    trends: { currentMonthSpending: 0, previousMonthSpending: 0, spendingChange: 0, savingsRate: 0 },
  }),
}));

describe('financial-insights security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should REJECT malformed month string via validation', async () => {
    const maliciousMonth = "2024-01' OR 1=1 --";

    // The handler catches errors and returns an error response
    const result = await handler({ month: maliciousMonth });

    // Assert that the analyzer was NOT called
    expect(analyzer.generateInsightsSummary).not.toHaveBeenCalled();

    // Assert that result is an error
    expect(result).toHaveProperty('isError', true);
  });

  it('should ACCEPT valid month string', async () => {
    const validMonth = "2024-01";

    await handler({ month: validMonth });

    expect(analyzer.generateInsightsSummary).toHaveBeenCalledWith(validMonth, expect.anything());
  });
});
