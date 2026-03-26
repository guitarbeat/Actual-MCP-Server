import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuleDataSchema } from '../../tools/manage-entity/types.js';
import {
  ALL_HISTORY_START_DATE,
  auditUncategorizedTransactions,
  buildUncategorizedAudit,
} from './uncategorized-audit.js';

const mockFetchAllAccounts = vi.fn();
const mockFetchAllCategoriesMap = vi.fn();
const mockFetchAllOnBudgetTransactionsWithMetadata = vi.fn();
const mockFetchTransactionsForAccount = vi.fn();
const mockFetchAllRules = vi.fn();
const mockResolveAccount = vi.fn();

vi.mock('../data/fetch-accounts.js', () => ({
  fetchAllAccounts: (...args: unknown[]) => mockFetchAllAccounts(...args),
}));

vi.mock('../data/fetch-categories.js', () => ({
  fetchAllCategoriesMap: (...args: unknown[]) => mockFetchAllCategoriesMap(...args),
}));

vi.mock('../data/fetch-transactions.js', () => ({
  fetchAllOnBudgetTransactionsWithMetadata: (...args: unknown[]) =>
    mockFetchAllOnBudgetTransactionsWithMetadata(...args),
  fetchTransactionsForAccount: (...args: unknown[]) => mockFetchTransactionsForAccount(...args),
}));

vi.mock('../data/fetch-rules.js', () => ({
  fetchAllRules: (...args: unknown[]) => mockFetchAllRules(...args),
}));

vi.mock('../utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: (...args: unknown[]) => mockResolveAccount(...args),
  },
}));

function makeRule(input: Record<string, unknown>) {
  return input as never;
}

describe('buildUncategorizedAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers imported_payee grouping and emits create-rule suggestions from strong peer history', () => {
    const result = buildUncategorizedAudit({
      transactions: [
        {
          id: 'uncat-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-03-12',
          amount: -2500,
          payee: 'payee-amazon',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: null,
          notes: 'order 1',
        },
        {
          id: 'uncat-2',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-03-10',
          amount: -1800,
          payee: 'payee-amazon',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: null,
          notes: 'order 2',
        },
        {
          id: 'peer-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-02-20',
          amount: -1200,
          payee: 'payee-amazon',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: 'cat-shopping',
          category_name: 'Shopping',
        },
        {
          id: 'peer-2',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-02-18',
          amount: -1500,
          payee: 'payee-amazon',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: 'cat-shopping',
          category_name: 'Shopping',
        },
        {
          id: 'peer-3',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-02-15',
          amount: -2200,
          payee: 'payee-amazon',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: 'cat-shopping',
          category_name: 'Shopping',
        },
      ],
      rules: [],
      categoriesById: {
        'cat-shopping': {
          id: 'cat-shopping',
          name: 'Shopping',
          group_id: 'group-1',
        },
      },
      startDate: '2026-01-01',
      endDate: '2026-03-25',
      accountScope: 'all-on-budget',
    });

    expect(result.summary.uncategorizedTransactionCount).toBe(2);
    expect(result.summary.ruleOpportunityCount).toBe(1);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      groupSource: 'imported_payee',
      groupLabel: 'AMZN Mktp US',
      accountName: 'Checking',
      uncategorizedCount: 2,
      historicalCategoryHint: {
        categoryId: 'cat-shopping',
        categoryName: 'Shopping',
        matchingPeerCount: 3,
        categorizedPeerCount: 3,
        confidence: 1,
      },
      suggestedAction: 'create-rule',
    });
    expect(result.groups[0].sampleTransactions[0].imported_payee).toBe('AMZN Mktp US');
    expect(result.groups[0].suggestedRule?.mode).toBe('create-rule');
    expect(() => RuleDataSchema.parse(result.groups[0].suggestedRule?.payload)).not.toThrow();
  });

  it('splits clusters by account and emits update-rule suggestions when a related rule exists', () => {
    const result = buildUncategorizedAudit({
      transactions: [
        {
          id: 'uncat-a1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-03-18',
          amount: -9900,
          payee: 'payee-electric',
          payee_name: 'Electric Co',
          category: null,
        },
        {
          id: 'uncat-a2',
          account: 'acc-2',
          account_name: 'Business Checking',
          date: '2026-03-17',
          amount: -5400,
          payee: 'payee-electric',
          payee_name: 'Electric Co',
          category: null,
        },
        {
          id: 'peer-a1-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-02-18',
          amount: -10100,
          payee: 'payee-electric',
          payee_name: 'Electric Co',
          category: 'cat-utilities',
          category_name: 'Utilities',
        },
        {
          id: 'peer-a1-2',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-01-18',
          amount: -9800,
          payee: 'payee-electric',
          payee_name: 'Electric Co',
          category: 'cat-utilities',
          category_name: 'Utilities',
        },
        {
          id: 'peer-a1-3',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2025-12-18',
          amount: -10300,
          payee: 'payee-electric',
          payee_name: 'Electric Co',
          category: 'cat-utilities',
          category_name: 'Utilities',
        },
      ],
      rules: [
        makeRule({
          id: 'rule-1',
          stage: 'default',
          conditionsOp: 'and',
          conditions: [{ field: 'payee', op: 'is', value: 'payee-electric' }],
          actions: [{ field: 'category', op: 'set', value: 'cat-old' }],
        }),
      ],
      categoriesById: {
        'cat-old': { id: 'cat-old', name: 'Misc', group_id: 'group-1' },
        'cat-utilities': { id: 'cat-utilities', name: 'Utilities', group_id: 'group-1' },
      },
      startDate: '2025-12-01',
      endDate: '2026-03-25',
      accountScope: 'all-on-budget',
    });

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toMatchObject({
      accountId: 'acc-1',
      accountName: 'Checking',
      suggestedAction: 'update-rule',
    });
    expect(result.groups[0].relatedRules[0]).toMatchObject({
      id: 'rule-1',
      matchField: 'payee',
      categoryActionValue: 'cat-old',
      categoryActionName: 'Misc',
    });
    expect(result.groups[0].suggestedRule).toMatchObject({
      mode: 'update-rule',
      targetRuleId: 'rule-1',
    });
    expect(() => RuleDataSchema.parse(result.groups[0].suggestedRule?.payload)).not.toThrow();
    expect(result.groups[0].suggestedRule?.payload.actions).toContainEqual({
      field: 'category',
      op: 'set',
      value: 'cat-utilities',
    });
    expect(result.groups[1]).toMatchObject({
      accountId: 'acc-2',
      accountName: 'Business Checking',
      suggestedAction: 'manual-review',
      historicalCategoryHint: null,
    });
  });

  it('keeps ambiguous clusters in manual review when peer history is too weak', () => {
    const result = buildUncategorizedAudit({
      transactions: [
        {
          id: 'uncat-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-03-20',
          amount: -2500,
          payee: 'payee-cafe',
          payee_name: 'Corner Cafe',
          category: null,
        },
        {
          id: 'peer-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-03-01',
          amount: -1200,
          payee: 'payee-cafe',
          payee_name: 'Corner Cafe',
          category: 'cat-dining',
          category_name: 'Dining',
        },
        {
          id: 'peer-2',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-02-14',
          amount: -900,
          payee: 'payee-cafe',
          payee_name: 'Corner Cafe',
          category: 'cat-dining',
          category_name: 'Dining',
        },
      ],
      rules: [],
      categoriesById: {
        'cat-dining': { id: 'cat-dining', name: 'Dining', group_id: 'group-1' },
      },
      startDate: '2026-01-01',
      endDate: '2026-03-25',
      accountScope: 'all-on-budget',
    });

    expect(result.groups[0].historicalCategoryHint).toBeNull();
    expect(result.groups[0].suggestedAction).toBe('manual-review');
    expect(result.groups[0].suggestedRule).toBeNull();
  });
});

describe('auditUncategorizedTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T12:00:00Z'));
    mockFetchAllAccounts.mockResolvedValue([
      { id: 'acc-1', name: 'Checking', offbudget: false, closed: false },
      { id: 'acc-2', name: 'Savings', offbudget: false, closed: false },
    ]);
    mockFetchAllCategoriesMap.mockResolvedValue({});
    mockFetchAllRules.mockResolvedValue([]);
    mockResolveAccount.mockResolvedValue('acc-1');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to all-history audits and excludes transfers', async () => {
    mockFetchAllOnBudgetTransactionsWithMetadata.mockResolvedValue({
      transactions: [
        {
          id: 'uncat-1',
          account: 'acc-1',
          date: '2026-03-10',
          amount: -4200,
          payee: 'payee-1',
          payee_name: 'Merchant',
          category: null,
        },
        {
          id: 'transfer-1',
          account: 'acc-1',
          date: '2026-03-11',
          amount: -4200,
          payee: 'payee-1',
          payee_name: 'Merchant',
          category: null,
          transfer_id: 'tx-transfer',
        },
      ],
      successfulAccountIds: ['acc-1'],
      warnings: [
        { accountId: 'acc-2', accountName: 'Savings', operation: 'transactions', error: 'timeout' },
      ],
    });

    const result = await auditUncategorizedTransactions();

    expect(mockFetchAllOnBudgetTransactionsWithMetadata).toHaveBeenCalledWith(
      expect.any(Array),
      ALL_HISTORY_START_DATE,
      '2026-03-25',
    );
    expect(result.summary).toMatchObject({
      startDate: ALL_HISTORY_START_DATE,
      endDate: '2026-03-25',
      excludedTransfers: true,
      accountScope: 'all-on-budget',
      totalTransactionsAnalyzed: 1,
      uncategorizedTransactionCount: 1,
      warningCount: 1,
    });
    expect(result.warnings[0]).toContain('Savings (acc-2)');
  });
});
