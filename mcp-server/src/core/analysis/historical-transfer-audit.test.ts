import { describe, expect, it } from 'vitest';
import type { Account, Transaction } from '../types/domain.js';
import {
  buildHistoricalTransferAudit,
  DEFAULT_TRANSFER_CANDIDATE_LIMIT,
  DEFAULT_TRANSFER_FLAGGED_REVIEW_LIMIT,
} from './historical-transfer-audit.js';
import { buildHistoricalTransferCandidateId } from './historical-transfer-utils.js';

const accounts: Account[] = [
  { id: 'checking', name: 'Checking', offbudget: false, closed: false },
  { id: 'credit', name: 'Credit Card', offbudget: false, closed: false },
  { id: 'venmo', name: 'Venmo', offbudget: true, closed: false },
];

function buildAudit(transactions: Transaction[], options?: { candidateLimit?: number; flaggedReviewLimit?: number }) {
  return buildHistoricalTransferAudit({
    accounts,
    transactions,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    candidateLimit: options?.candidateLimit,
    flaggedReviewLimit: options?.flaggedReviewLimit,
  });
}

describe('buildHistoricalTransferAudit', () => {
  it('finds strict unique inverse pairs, dedupes mirrored matches, and reports hotspots', () => {
    const result = buildAudit([
      {
        id: 'tx-out-1',
        account: 'checking',
        account_name: 'Checking',
        date: '2025-02-01',
        amount: -5000,
        imported_payee: 'Payment',
      },
      {
        id: 'tx-in-1',
        account: 'credit',
        account_name: 'Credit Card',
        date: '2025-02-02',
        amount: 5000,
        imported_payee: 'Payment',
      },
      {
        id: 'tx-out-2',
        account: 'checking',
        account_name: 'Checking',
        date: '2025-03-01',
        amount: -2500,
        imported_payee: 'Transfer',
        category: 'cat-a',
        category_name: 'Utilities',
      },
      {
        id: 'tx-in-2',
        account: 'venmo',
        account_name: 'Venmo',
        date: '2025-03-03',
        amount: 2500,
        imported_payee: 'Transfer',
      },
    ]);

    expect(result.summary.strictCandidateCount).toBe(2);
    expect(result.summary.candidatesWithUncategorizedSide).toBe(2);
    expect(result.summary.candidatesWithBothSidesUncategorized).toBe(1);
    expect(result.strictCandidates).toHaveLength(2);
    expect(result.strictCandidates[0]?.candidateId).toBe(
      buildHistoricalTransferCandidateId('tx-out-1', 'tx-in-1'),
    );
    expect(result.summary.topAccountPairHotspots).toEqual([
      {
        accountIds: ['checking', 'credit'],
        accountNames: ['Checking', 'Credit Card'],
        candidateCount: 1,
        candidatesWithUncategorizedSide: 1,
      },
      {
        accountIds: ['checking', 'venmo'],
        accountNames: ['Checking', 'Venmo'],
        candidateCount: 1,
        candidatesWithUncategorizedSide: 1,
      },
    ]);
  });

  it('excludes ambiguous multi-match chains from strict candidates', () => {
    const result = buildAudit([
      {
        id: 'tx-a',
        account: 'checking',
        account_name: 'Checking',
        date: '2025-04-01',
        amount: -4200,
        imported_payee: 'Payment',
      },
      {
        id: 'tx-b',
        account: 'credit',
        account_name: 'Credit Card',
        date: '2025-04-02',
        amount: 4200,
        imported_payee: 'Payment',
      },
      {
        id: 'tx-c',
        account: 'venmo',
        account_name: 'Venmo',
        date: '2025-04-03',
        amount: 4200,
        imported_payee: 'Payment',
      },
    ]);

    expect(result.summary.strictCandidateCount).toBe(0);
    expect(result.strictCandidates).toHaveLength(0);
  });

  it('flags transfer-like uncategorized leftovers but excludes transactions already covered by strict pairs', () => {
    const result = buildAudit([
      {
        id: 'paired-out',
        account: 'checking',
        account_name: 'Checking',
        date: '2025-05-01',
        amount: -1000,
        imported_payee: 'Payment',
      },
      {
        id: 'paired-in',
        account: 'credit',
        account_name: 'Credit Card',
        date: '2025-05-02',
        amount: 1000,
        imported_payee: 'Payment',
      },
      {
        id: 'leftover-1',
        account: 'checking',
        account_name: 'Checking',
        date: '2025-05-10',
        amount: -2300,
        imported_payee: 'Payment',
        notes: 'Needs manual review',
      },
      {
        id: 'leftover-2',
        account: 'checking',
        account_name: 'Checking',
        date: '2025-05-11',
        amount: -1800,
        imported_payee: 'Payment',
      },
      {
        id: 'leftover-3',
        account: 'venmo',
        account_name: 'Venmo',
        date: '2025-05-12',
        amount: -750,
        imported_payee: 'Venmo',
      },
    ]);

    expect(result.summary.flaggedReviewGroupCount).toBe(2);
    expect(result.flaggedReviewGroups).toEqual([
      expect.objectContaining({
        groupLabel: 'Payment',
        accountId: 'checking',
        count: 2,
        sampleTransactionIds: ['leftover-2', 'leftover-1'],
      }),
      expect.objectContaining({
        groupLabel: 'Venmo',
        accountId: 'venmo',
        count: 1,
      }),
    ]);
    expect(
      result.flaggedReviewGroups[0]?.sampleTransactionIds.includes('paired-out'),
    ).toBe(false);
  });

  it('reports total versus returned counts when limits are applied', () => {
    const transactions: Transaction[] = [];

    for (let index = 0; index < DEFAULT_TRANSFER_CANDIDATE_LIMIT + 1; index += 1) {
      transactions.push(
        {
          id: `out-${index}`,
          account: 'checking',
          account_name: 'Checking',
          date: `2025-06-${String((index % 27) + 1).padStart(2, '0')}`,
          amount: -(index + 1) * 100,
          imported_payee: 'Transfer',
        },
        {
          id: `in-${index}`,
          account: 'credit',
          account_name: 'Credit Card',
          date: `2025-06-${String((index % 27) + 1).padStart(2, '0')}`,
          amount: (index + 1) * 100,
          imported_payee: 'Transfer',
        },
      );
    }

    for (let index = 0; index < DEFAULT_TRANSFER_FLAGGED_REVIEW_LIMIT + 1; index += 1) {
      transactions.push({
        id: `review-${index}`,
        account: 'checking',
        account_name: 'Checking',
        date: `2025-07-${String((index % 27) + 1).padStart(2, '0')}`,
        amount: -(index + 1) * 321,
        imported_payee: `Payment ${index}`,
      });
    }

    const result = buildAudit(transactions, {
      candidateLimit: 5,
      flaggedReviewLimit: 3,
    });

    expect(result.summary.strictCandidateCount).toBe(DEFAULT_TRANSFER_CANDIDATE_LIMIT + 1);
    expect(result.summary.returnedStrictCandidateCount).toBe(5);
    expect(result.strictCandidates).toHaveLength(5);
    expect(result.summary.flaggedReviewGroupCount).toBe(
      DEFAULT_TRANSFER_FLAGGED_REVIEW_LIMIT + 1,
    );
    expect(result.summary.returnedFlaggedReviewGroupCount).toBe(3);
    expect(result.flaggedReviewGroups).toHaveLength(3);
  });
});
