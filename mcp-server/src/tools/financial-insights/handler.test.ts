import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const { mockGenerateInsightsSummary } = vi.hoisted(() => ({
  mockGenerateInsightsSummary: vi.fn(),
}));

vi.mock('../../core/analysis/financial-analyzer.js', () => ({
  generateInsightsSummary: mockGenerateInsightsSummary,
}));

const SAMPLE_INSIGHTS = {
  summary: 'Overall financial health looks good.',
  month: '2024-01',
  partial: false,
  warnings: [],
  overspending: [],
  uncategorized: { count: 0, totalAmount: 0, topPayees: [] },
  accountHealth: [{ name: 'Checking', balance: 50000, status: 'healthy' }],
  upcomingSchedules: [],
  trends: {
    currentMonthSpending: 300000,
    previousMonthSpending: 280000,
    spendingChange: 7.1,
    savingsRate: 15.2,
  },
};

function parseJsonResponse(response: unknown): Record<string, unknown> {
  const res = response as { content: Array<Record<string, unknown>> };
  const firstContent = res.content[0];
  if (!('text' in firstContent)) {
    throw new Error('Expected text content');
  }
  return JSON.parse(firstContent.text as string) as Record<string, unknown>;
}

describe('get-financial-insights handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateInsightsSummary.mockResolvedValue(SAMPLE_INSIGHTS);
  });

  it('returns financial insights for default (no args)', async () => {
    const response = await handler({});

    expect(mockGenerateInsightsSummary).toHaveBeenCalledWith(undefined, {
      includeSchedules: undefined,
      scheduleDays: undefined,
    });
    expect(response.isError).toBeUndefined();
    const data = parseJsonResponse(response);
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('month');
    expect(data).toHaveProperty('trends');
  });

  it('passes month parameter to generateInsightsSummary', async () => {
    await handler({ month: '2024-06' });

    expect(mockGenerateInsightsSummary).toHaveBeenCalledWith('2024-06', expect.any(Object));
  });

  it('passes scheduleDays parameter', async () => {
    await handler({ scheduleDays: 30 });

    expect(mockGenerateInsightsSummary).toHaveBeenCalledWith(undefined, {
      includeSchedules: undefined,
      scheduleDays: 30,
    });
  });

  it('formats overspending when present', async () => {
    mockGenerateInsightsSummary.mockResolvedValue({
      ...SAMPLE_INSIGHTS,
      overspending: [
        {
          groupName: 'Food',
          categoryName: 'Groceries',
          budgeted: 50000,
          spent: 60000,
          overage: 10000,
        },
      ],
    });

    const response = await handler({});
    const data = parseJsonResponse(response);

    const overspending = data.overspending as Array<{ category: string }>;
    expect(Array.isArray(overspending)).toBe(true);
    expect(overspending[0].category).toBe('Food > Groceries');
  });

  it('returns error when generateInsightsSummary throws', async () => {
    mockGenerateInsightsSummary.mockRejectedValue(new Error('API unavailable'));

    const response = await handler({});

    expect(response.isError).toBe(true);
    const data = parseJsonResponse(response);
    expect(data.message).toContain('API unavailable');
  });

  it('returns validation error for invalid month format', async () => {
    const response = await handler({ month: 'not-a-month' });

    expect(response.isError).toBe(true);
  });
});
