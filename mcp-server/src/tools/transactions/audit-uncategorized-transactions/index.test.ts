import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockAuditUncategorizedTransactions = vi.fn();

vi.mock('../../../core/analysis/uncategorized-audit.js', () => ({
  auditUncategorizedTransactions: (...args: unknown[]) =>
    mockAuditUncategorizedTransactions(...args),
}));

function parsePayload(result: Awaited<ReturnType<typeof handler>>) {
  const firstContent = result.content[0];

  if (firstContent.type !== 'text') {
    throw new Error('Expected text content');
  }

  return JSON.parse(firstContent.text);
}

describe('audit-uncategorized-transactions handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditUncategorizedTransactions.mockResolvedValue({
      summary: {
        startDate: '1900-01-01',
        endDate: '2026-03-25',
        excludedTransfers: true,
        accountScope: 'all-on-budget',
        totalTransactionsAnalyzed: 10,
        uncategorizedTransactionCount: 4,
        uncategorizedTransactionTotalAmount: -12345,
        totalGroupCount: 2,
        returnedGroupCount: 2,
        ruleOpportunityCount: 1,
        manualReviewGroupCount: 1,
        warningCount: 0,
      },
      groups: [],
      warnings: [],
    });
  });

  it('parses defaults and returns the audit payload', async () => {
    const result = await handler({});
    const payload = parsePayload(result);

    expect(mockAuditUncategorizedTransactions).toHaveBeenCalledWith({
      excludeTransfers: true,
      groupLimit: 25,
      samplePerGroup: 5,
    });
    expect(payload.summary.uncategorizedTransactionCount).toBe(4);
  });

  it('passes through explicit filters', async () => {
    await handler({
      accountId: 'Checking',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      excludeTransfers: false,
      groupLimit: 10,
      samplePerGroup: 3,
    });

    expect(mockAuditUncategorizedTransactions).toHaveBeenCalledWith({
      accountId: 'Checking',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      excludeTransfers: false,
      groupLimit: 10,
      samplePerGroup: 3,
    });
  });
});
