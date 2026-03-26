import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleUncategorizedResource } from './uncategorized-resources.js';

const mockAuditUncategorizedTransactions = vi.fn();

vi.mock('../core/analysis/uncategorized-audit.js', () => ({
  auditUncategorizedTransactions: (...args: unknown[]) =>
    mockAuditUncategorizedTransactions(...args),
}));

function getTextContent(result: Awaited<ReturnType<typeof handleUncategorizedResource>>): string {
  const firstContent = result.contents[0];

  if (!('text' in firstContent)) {
    throw new Error('Expected a text resource');
  }

  return firstContent.text;
}

describe('handleUncategorizedResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rule opportunities and manual review sections', async () => {
    mockAuditUncategorizedTransactions.mockResolvedValue({
      summary: {
        startDate: '1900-01-01',
        endDate: '2026-03-25',
        excludedTransfers: true,
        accountScope: 'all-on-budget',
        totalTransactionsAnalyzed: 20,
        uncategorizedTransactionCount: 5,
        uncategorizedTransactionTotalAmount: -15000,
        totalGroupCount: 2,
        returnedGroupCount: 2,
        ruleOpportunityCount: 1,
        manualReviewGroupCount: 1,
        warningCount: 0,
      },
      groups: [
        {
          groupSource: 'imported_payee',
          groupLabel: 'AMZN Mktp US',
          accountId: 'acc-1',
          accountName: 'Checking',
          uncategorizedCount: 3,
          uncategorizedTotalAmount: -9000,
          oldestDate: '2026-03-01',
          newestDate: '2026-03-20',
          sampleTransactionIds: ['tx-1'],
          sampleTransactions: [
            {
              id: 'tx-1',
              date: '2026-03-20',
              amount: -3000,
              payee: 'Amazon',
              imported_payee: 'AMZN Mktp US',
              notes: 'order',
            },
          ],
          relatedRules: [],
          historicalCategoryHint: {
            categoryId: 'cat-shopping',
            categoryName: 'Shopping',
            matchingPeerCount: 3,
            categorizedPeerCount: 3,
            confidence: 1,
          },
          suggestedAction: 'create-rule',
          suggestedRule: {
            mode: 'create-rule',
            payload: { conditionsOp: 'and', conditions: [], actions: [] },
            reason: 'Historical peers strongly suggest Shopping.',
          },
        },
        {
          groupSource: 'payee',
          groupLabel: 'Corner Cafe',
          accountId: 'acc-1',
          accountName: 'Checking',
          uncategorizedCount: 2,
          uncategorizedTotalAmount: -6000,
          oldestDate: '2026-02-01',
          newestDate: '2026-03-01',
          sampleTransactionIds: ['tx-2'],
          sampleTransactions: [
            {
              id: 'tx-2',
              date: '2026-03-01',
              amount: -3000,
              payee: 'Corner Cafe',
              imported_payee: null,
              notes: null,
            },
          ],
          relatedRules: [],
          historicalCategoryHint: null,
          suggestedAction: 'manual-review',
          suggestedRule: null,
        },
      ],
      warnings: [],
    });

    const result = await handleUncategorizedResource('actual://uncategorized');
    const text = getTextContent(result);

    expect(text).toContain('# Uncategorized Transaction Audit');
    expect(text).toContain('## Rule Opportunities');
    expect(text).toContain('### AMZN Mktp US (Checking)');
    expect(text).toContain('Historical hint: Shopping (3/3, 100%)');
    expect(text).toContain('## Manual Review Leftovers');
    expect(text).toContain('### Corner Cafe (Checking)');
  });

  it('shows an empty state when everything is categorized', async () => {
    mockAuditUncategorizedTransactions.mockResolvedValue({
      summary: {
        startDate: '1900-01-01',
        endDate: '2026-03-25',
        excludedTransfers: true,
        accountScope: 'all-on-budget',
        totalTransactionsAnalyzed: 20,
        uncategorizedTransactionCount: 0,
        uncategorizedTransactionTotalAmount: 0,
        totalGroupCount: 0,
        returnedGroupCount: 0,
        ruleOpportunityCount: 0,
        manualReviewGroupCount: 0,
        warningCount: 0,
      },
      groups: [],
      warnings: [],
    });

    const result = await handleUncategorizedResource('actual://uncategorized');
    const text = getTextContent(result);

    expect(text).toContain('_No uncategorized transactions found._');
  });
});
