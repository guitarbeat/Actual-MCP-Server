import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Category, Transaction } from '../types/domain.js';
import {
  applyTimelineReconAudit,
  buildTimelineReconAudit,
  parseTimelineEntries,
  type NormalizedSupplementalRow,
  type TimelineReconAuditFile,
  type TimelineStay,
} from './timeline-reconciliation.js';

const mockCreateRule = vi.fn();
const mockGetCategories = vi.fn();
const mockUpdateTransaction = vi.fn();
const mockFetchAllAccounts = vi.fn();
const mockFetchAllOnBudgetTransactionsWithMetadata = vi.fn();
const mockFetchAllRules = vi.fn();

vi.mock('../api/actual-client.js', () => ({
  createRule: (...args: unknown[]) => mockCreateRule(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
  updateTransaction: (...args: unknown[]) => mockUpdateTransaction(...args),
}));

vi.mock('../data/fetch-accounts.js', () => ({
  fetchAllAccounts: (...args: unknown[]) => mockFetchAllAccounts(...args),
}));

vi.mock('../data/fetch-transactions.js', () => ({
  fetchAllOnBudgetTransactionsWithMetadata: (...args: unknown[]) =>
    mockFetchAllOnBudgetTransactionsWithMetadata(...args),
}));

vi.mock('../data/fetch-rules.js', () => ({
  fetchAllRules: (...args: unknown[]) => mockFetchAllRules(...args),
}));

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    account: 'checking',
    account_name: 'Checking',
    date: '2025-08-10',
    amount: -1234,
    payee_name: 'Select Stop',
    imported_payee: 'Select Stop',
    category: null,
    notes: null,
    ...overrides,
  };
}

function buildSupplementalRow(
  overrides: Partial<NormalizedSupplementalRow> = {},
): NormalizedSupplementalRow {
  return {
    date: '2025-08-10',
    description: 'Select Stop',
    statementDescription: 'Select Stop',
    normalizedDescription: 'select stop',
    normalizedStatementDescription: 'select stop',
    type: 'Expense',
    category: 'Shopping',
    amountCents: -1234,
    accountName: 'Checking',
    actualAccountId: 'checking',
    actualAccountName: 'Checking',
    notes: '',
    ...overrides,
  };
}

function buildVisitStay(overrides: Partial<TimelineStay> = {}): TimelineStay {
  return {
    source: 'visit',
    startTime: '2025-08-11T19:00:00-05:00',
    endTime: '2025-08-11T21:00:00-05:00',
    startDate: '2025-08-11',
    endDate: '2025-08-11',
    durationMinutes: 120,
    latitude: 30.266,
    longitude: -97.742,
    placeKey: 'place:place-mohawk',
    placeId: 'place-mohawk',
    semanticType: 'Nightlife',
    probability: 0.95,
    searchUrl:
      'https://www.google.com/maps/search/?api=1&query=30.266%2C-97.742&query_place_id=place-mohawk',
    ...overrides,
  };
}

const accounts: Account[] = [{ id: 'checking', name: 'Checking', offbudget: false, closed: false }];
const categoriesById: Record<string, Category> = {
  'cat-shopping': { id: 'cat-shopping', name: '🛍️ Shopping / Marketplace', group_id: 'group-1' },
  'cat-experiences': { id: 'cat-experiences', name: '🎭 Experiences', group_id: 'group-1' },
};

describe('parseTimelineEntries', () => {
  it('normalizes visits and activities and only keeps timelinePath pseudo-stays when they are long enough', () => {
    const parsed = parseTimelineEntries(
      [
        {
          startTime: '2025-08-10T09:00:00-05:00',
          endTime: '2025-08-10T10:00:00-05:00',
          visit: {
            topCandidate: {
              placeID: 'place-cafe',
              placeLocation: 'geo:30.2700,-97.7500',
              semanticType: 'Cafe',
              probability: '0.91',
            },
          },
        },
        {
          startTime: '2025-08-10T10:00:00-05:00',
          endTime: '2025-08-10T10:20:00-05:00',
          activity: {
            start: 'geo:30.2700,-97.7500',
            end: 'geo:30.2800,-97.7600',
            distanceMeters: '1200',
            topCandidate: { type: 'in passenger vehicle', probability: '0.90' },
          },
        },
        {
          startTime: '2025-08-10T11:00:00-05:00',
          endTime: '2025-08-10T11:20:00-05:00',
          timelinePath: [
            {
              point: 'geo:30.2710,-97.7510',
              durationMinutesOffsetFromStartTime: '5',
            },
          ],
        },
        {
          startTime: '2025-08-10T12:00:00-05:00',
          endTime: '2025-08-10T12:40:00-05:00',
          timelinePath: [
            {
              point: 'geo:30.2720,-97.7520',
              durationMinutesOffsetFromStartTime: '0',
            },
            {
              point: 'geo:30.2726,-97.7524',
              durationMinutesOffsetFromStartTime: '18',
            },
          ],
        },
      ],
      '2025-08-01',
      '2025-08-31',
    );

    expect(parsed.stays).toHaveLength(2);
    expect(parsed.stays.some((stay) => stay.source === 'visit')).toBe(true);
    expect(parsed.stays.some((stay) => stay.source === 'timelinePath')).toBe(true);
    expect(parsed.activities).toHaveLength(1);
    expect(parsed.activities[0]).toMatchObject({
      mode: 'in passenger vehicle',
      distanceMeters: 1200,
    });
  });
});

describe('buildTimelineReconAudit', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('promotes exact matches, uses place overrides for confirmed matches, and leaves payment-like rows manual', () => {
    const result = buildTimelineReconAudit({
      accounts,
      transactions: [
        buildTransaction({
          id: 'tx-exact',
          date: '2025-08-10',
          amount: -1234,
          payee_name: 'Select Stop',
          imported_payee: 'Select Stop',
        }),
        buildTransaction({
          id: 'tx-confirmed',
          date: '2025-08-11',
          amount: -4500,
          payee_name: 'Mohawk',
          imported_payee: 'Mohawk',
        }),
        buildTransaction({
          id: 'tx-manual',
          date: '2025-08-12',
          amount: -2200,
          payee_name: 'Payment',
          imported_payee: 'Payment',
        }),
      ],
      categoriesById,
      supplementalRows: [
        buildSupplementalRow(),
        buildSupplementalRow({
          date: '2025-08-11',
          description: 'Mohawk',
          statementDescription: 'Mohawk',
          normalizedDescription: 'mohawk',
          normalizedStatementDescription: 'mohawk',
          category: 'Other',
          amountCents: -4500,
        }),
      ],
      timeline: {
        stays: [buildVisitStay()],
        activities: [],
      },
      placeCache: {
        places: {
          'place:place-mohawk': {
            resolvedName: 'Mohawk Austin',
            merchantClass: 'music venue',
          },
        },
      },
      categoryOverrides: {
        transactions: {},
        merchantNames: {},
        placeKeys: {
          'place:place-mohawk': '🎭 Experiences',
        },
      },
      startDate: '2025-08-01',
      endDate: '2025-08-31',
    });

    expect(result.summary.exactReadyCount).toBe(1);
    expect(result.summary.confirmedReadyCount).toBe(1);
    expect(result.summary.manualCount).toBe(1);

    const exactCandidate = result.candidates.find(
      (candidate) => candidate.transactionId === 'tx-exact',
    );
    const confirmedCandidate = result.candidates.find(
      (candidate) => candidate.transactionId === 'tx-confirmed',
    );
    const manualCandidate = result.candidates.find(
      (candidate) => candidate.transactionId === 'tx-manual',
    );

    expect(exactCandidate).toMatchObject({
      status: 'ready-exact',
      recommendedCategoryName: '🛍️ Shopping / Marketplace',
    });
    expect(confirmedCandidate).toMatchObject({
      status: 'ready-confirmed',
      recommendedCategoryName: '🎭 Experiences',
      resolvedVenueName: 'Mohawk Austin',
    });
    expect(manualCandidate).toMatchObject({
      status: 'manual',
    });
    expect(manualCandidate?.blockedReason).toContain('location-ineligible');
  });
});

describe('applyTimelineReconAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAllAccounts.mockResolvedValue(accounts);
    mockFetchAllOnBudgetTransactionsWithMetadata.mockResolvedValue({
      transactions: [
        buildTransaction({
          id: 'tx-exact',
          notes: 'existing note',
        }),
        buildTransaction({
          id: 'tx-confirmed-1',
          date: '2025-08-11',
          amount: -4500,
          payee_name: 'Mohawk',
          imported_payee: 'Mohawk',
          notes: 'old line',
        }),
        buildTransaction({
          id: 'tx-confirmed-2',
          date: '2025-08-12',
          amount: -4600,
          payee_name: 'Mohawk',
          imported_payee: 'Mohawk',
          notes: null,
        }),
      ],
      successfulAccountIds: ['checking'],
      warnings: [],
    });
    mockGetCategories.mockResolvedValue([
      { id: 'cat-shopping', name: '🛍️ Shopping / Marketplace' },
      { id: 'cat-experiences', name: '🎭 Experiences' },
    ]);
    mockFetchAllRules.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('updates only ready candidates, appends timeline provenance notes to confirmed rows, and creates a narrow rule after repeated confirmations', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'timeline-recon-'));
    const auditPath = join(tempDir, 'timeline-recon-audit.json');

    const audit: TimelineReconAuditFile = {
      version: 1,
      generatedAt: new Date().toISOString(),
      startDate: '2025-08-01',
      endDate: '2025-08-31',
      summary: {
        startDate: '2025-08-01',
        endDate: '2025-08-31',
        totalUncategorizedTransactions: 4,
        locationEligibleTransactions: 3,
        locationIneligibleTransactions: 1,
        exactReadyCount: 1,
        confirmedReadyCount: 2,
        manualCount: 1,
        ruleEligibleCount: 2,
        warningCount: 0,
      },
      warnings: [],
      manualReviews: [],
      candidates: [
        {
          transactionId: 'tx-exact',
          accountId: 'checking',
          accountName: 'Checking',
          transactionDate: '2025-08-10',
          transactionAmountCents: -1234,
          payeeName: 'Select Stop',
          importedPayee: 'Select Stop',
          confidenceTier: 'tier1-exact',
          status: 'ready-exact',
          recommendedCategoryName: '🛍️ Shopping / Marketplace',
          ruleField: 'imported_payee',
          ruleValue: 'Select Stop',
        },
        {
          transactionId: 'tx-confirmed-1',
          accountId: 'checking',
          accountName: 'Checking',
          transactionDate: '2025-08-11',
          transactionAmountCents: -4500,
          payeeName: 'Mohawk',
          importedPayee: 'Mohawk',
          confidenceTier: 'tier3-web-confirmed',
          status: 'ready-confirmed',
          recommendedCategoryName: '🎭 Experiences',
          ruleField: 'imported_payee',
          ruleValue: 'Mohawk',
          noteText: '[Timeline] Mohawk Austin (music venue)',
          resolvedVenueName: 'Mohawk Austin',
        },
        {
          transactionId: 'tx-confirmed-2',
          accountId: 'checking',
          accountName: 'Checking',
          transactionDate: '2025-08-12',
          transactionAmountCents: -4600,
          payeeName: 'Mohawk',
          importedPayee: 'Mohawk',
          confidenceTier: 'tier3-web-confirmed',
          status: 'ready-confirmed',
          recommendedCategoryName: '🎭 Experiences',
          ruleField: 'imported_payee',
          ruleValue: 'Mohawk',
          noteText: '[Timeline] Mohawk Austin (music venue)',
          resolvedVenueName: 'Mohawk Austin',
        },
        {
          transactionId: 'tx-manual',
          accountId: 'checking',
          accountName: 'Checking',
          transactionDate: '2025-08-13',
          transactionAmountCents: -2200,
          payeeName: 'Payment',
          importedPayee: 'Payment',
          confidenceTier: 'tier4-manual',
          status: 'manual',
          blockedReason: 'Payment/transfer-style or otherwise location-ineligible transaction.',
        },
      ],
    };

    await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

    const result = await applyTimelineReconAudit({
      repoRoot: tempDir,
      reconDir: tempDir,
      supplementalCsvPath: join(tempDir, 'unused.csv'),
      timelinePath: join(tempDir, 'unused.json'),
      auditPath,
      candidatesPath: join(tempDir, 'unused-candidates.csv'),
      manualReviewPath: join(tempDir, 'unused-manual.csv'),
      placeCachePath: join(tempDir, 'unused-cache.json'),
      categoryOverridesPath: join(tempDir, 'unused-overrides.json'),
    });

    expect(mockUpdateTransaction).toHaveBeenCalledTimes(3);
    expect(mockCreateRule).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      exactUpdatesApplied: 1,
      confirmedUpdatesApplied: 2,
      skippedManualCandidates: 1,
    });

    const exactUpdate = mockUpdateTransaction.mock.calls.find(([id]) => id === 'tx-exact');
    const confirmedUpdate = mockUpdateTransaction.mock.calls.find(
      ([id]) => id === 'tx-confirmed-1',
    );

    expect(exactUpdate?.[1]).toMatchObject({
      category: 'cat-shopping',
    });
    expect(exactUpdate?.[1]).not.toHaveProperty('notes');
    expect(confirmedUpdate?.[1]).toMatchObject({
      category: 'cat-experiences',
    });
    expect((confirmedUpdate?.[1] as Record<string, unknown>).notes).toContain('Mohawk Austin');
    expect(mockCreateRule.mock.calls[0]?.[0]).toMatchObject({
      conditionsOp: 'and',
      actions: [{ field: 'category', op: 'set', value: 'cat-experiences' }],
    });
  });
});
