import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockAuditHistoricalTransfers = vi.fn();

vi.mock('../../../core/analysis/historical-transfer-audit.js', () => ({
  auditHistoricalTransfers: (...args: unknown[]) => mockAuditHistoricalTransfers(...args),
}));

function parsePayload(result: Awaited<ReturnType<typeof handler>>) {
  const firstContent = result.content[0];

  if (firstContent.type !== 'text') {
    throw new Error('Expected text content');
  }

  return JSON.parse(firstContent.text);
}

describe('audit-historical-transfers handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditHistoricalTransfers.mockResolvedValue({
      summary: {
        startDate: '1900-01-01',
        endDate: '2026-03-25',
        accountScope: 'all-accounts',
        totalTransactionsAnalyzed: 42,
        eligibleTransactionCount: 36,
        strictCandidateCount: 3,
        returnedStrictCandidateCount: 3,
        candidatesWithUncategorizedSide: 2,
        candidatesWithBothSidesUncategorized: 1,
        flaggedReviewGroupCount: 4,
        returnedFlaggedReviewGroupCount: 4,
        topAccountPairHotspots: [],
        warningCount: 0,
      },
      strictCandidates: [],
      flaggedReviewGroups: [],
      warnings: [],
    });
  });

  it('parses defaults and returns the audit payload', async () => {
    const result = await handler({});
    const payload = parsePayload(result);

    expect(mockAuditHistoricalTransfers).toHaveBeenCalledWith({
      candidateLimit: 100,
      flaggedReviewLimit: 25,
    });
    expect(payload.summary.strictCandidateCount).toBe(3);
  });

  it('passes through explicit filters', async () => {
    await handler({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      candidateLimit: 10,
      flaggedReviewLimit: 8,
    });

    expect(mockAuditHistoricalTransfers).toHaveBeenCalledWith({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      candidateLimit: 10,
      flaggedReviewLimit: 8,
    });
  });
});
