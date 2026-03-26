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

  it('emits account-scoped create-rule suggestions even when sibling accounts imply different categories', () => {
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
        {
          id: 'uncat-3',
          account: 'acc-2',
          account_name: 'Business Checking',
          date: '2026-03-13',
          amount: -2500,
          payee: 'payee-amazon-business',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: null,
        },
        {
          id: 'peer-4',
          account: 'acc-2',
          account_name: 'Business Checking',
          date: '2026-02-20',
          amount: -2000,
          payee: 'payee-amazon-business',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: 'cat-supplies',
          category_name: 'Office Supplies',
        },
        {
          id: 'peer-5',
          account: 'acc-2',
          account_name: 'Business Checking',
          date: '2026-02-18',
          amount: -1700,
          payee: 'payee-amazon-business',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: 'cat-supplies',
          category_name: 'Office Supplies',
        },
        {
          id: 'peer-6',
          account: 'acc-2',
          account_name: 'Business Checking',
          date: '2026-02-15',
          amount: -2100,
          payee: 'payee-amazon-business',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: 'cat-supplies',
          category_name: 'Office Supplies',
        },
      ],
      rules: [],
      categoriesById: {
        'cat-shopping': {
          id: 'cat-shopping',
          name: 'Shopping',
          group_id: 'group-1',
        },
        'cat-supplies': {
          id: 'cat-supplies',
          name: 'Office Supplies',
          group_id: 'group-2',
        },
      },
      startDate: '2026-01-01',
      endDate: '2026-03-25',
      accountScope: 'all-on-budget',
    });

    const checkingGroup = result.groups.find((group) => group.accountId === 'acc-1');

    expect(result.summary.uncategorizedTransactionCount).toBe(3);
    expect(result.summary.ruleOpportunityCount).toBe(2);
    expect(result.groups).toHaveLength(2);
    expect(checkingGroup).toMatchObject({
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
    expect(checkingGroup?.sampleTransactions[0].imported_payee).toBe('AMZN Mktp US');
    expect(checkingGroup?.suggestedRule?.mode).toBe('create-rule');
    expect(checkingGroup?.suggestedRule?.payload.conditions).toEqual([
      { field: 'account', op: 'is', value: 'acc-1' },
      { field: 'imported_payee', op: 'is', value: 'AMZN Mktp US' },
    ]);
    expect(() => RuleDataSchema.parse(checkingGroup?.suggestedRule?.payload)).not.toThrow();
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
      ruleMatchType: 'payee:is',
      categoryActionValue: 'cat-old',
      categoryActionName: 'Misc',
    });
    expect(result.groups[0].suggestedRule).toMatchObject({
      mode: 'update-rule',
      targetRuleId: 'rule-1',
    });
    expect(() => RuleDataSchema.parse(result.groups[0].suggestedRule?.payload)).not.toThrow();
    expect(result.groups[0].suggestedRule?.payload.stage).toBe('default');
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

  it('does not treat rules with conflicting account conditions as related', () => {
    const result = buildUncategorizedAudit({
      transactions: [
        {
          id: 'uncat-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-03-20',
          amount: -2500,
          payee: 'payee-power',
          payee_name: 'Power Co',
          category: null,
        },
        {
          id: 'peer-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-02-20',
          amount: -2500,
          payee: 'payee-power',
          payee_name: 'Power Co',
          category: 'cat-utilities',
          category_name: 'Utilities',
        },
        {
          id: 'peer-2',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-02-10',
          amount: -2600,
          payee: 'payee-power',
          payee_name: 'Power Co',
          category: 'cat-utilities',
          category_name: 'Utilities',
        },
        {
          id: 'peer-3',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-01-20',
          amount: -2550,
          payee: 'payee-power',
          payee_name: 'Power Co',
          category: 'cat-utilities',
          category_name: 'Utilities',
        },
      ],
      rules: [
        makeRule({
          id: 'rule-wrong-account',
          stage: 'default',
          conditionsOp: 'and',
          conditions: [
            { field: 'account', op: 'is', value: 'acc-2' },
            { field: 'payee', op: 'is', value: 'payee-power' },
          ],
          actions: [{ field: 'category', op: 'set', value: 'cat-old' }],
        }),
      ],
      categoriesById: {
        'cat-old': { id: 'cat-old', name: 'Old', group_id: 'group-1' },
        'cat-utilities': { id: 'cat-utilities', name: 'Utilities', group_id: 'group-1' },
      },
      startDate: '2026-01-01',
      endDate: '2026-03-25',
      accountScope: 'all-on-budget',
    });

    expect(result.groups[0].relatedRules).toEqual([]);
    expect(result.groups[0].suggestedAction).toBe('create-rule');
  });

  it('blocks unsafe update suggestions when matching rules contain unsupported conditions or actions', () => {
    const result = buildUncategorizedAudit({
      transactions: [
        {
          id: 'uncat-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-03-18',
          amount: -9900,
          payee: 'payee-electric',
          payee_name: 'Electric Co',
          category: null,
        },
        {
          id: 'peer-1',
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
          id: 'peer-2',
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
          id: 'peer-3',
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
          id: 'rule-unsupported',
          stage: 'default',
          conditionsOp: 'and',
          conditions: [
            { field: 'payee', op: 'is', value: 'payee-electric' },
            { field: 'amount', op: 'gt', value: 1000 },
          ],
          actions: [
            { field: 'category', op: 'set', value: 'cat-old' },
            { op: 'link-schedule', value: 'schedule-1' },
          ],
        }),
      ],
      categoriesById: {
        'cat-old': { id: 'cat-old', name: 'Old', group_id: 'group-1' },
        'cat-utilities': { id: 'cat-utilities', name: 'Utilities', group_id: 'group-1' },
      },
      startDate: '2025-12-01',
      endDate: '2026-03-25',
      accountScope: 'all-on-budget',
    });

    expect(result.groups[0].relatedRules[0]).toMatchObject({
      id: 'rule-unsupported',
      ruleMatchType: 'payee:is',
    });
    expect(result.groups[0].suggestedAction).toBe('manual-review');
    expect(result.groups[0].suggestedRule).toBeNull();
    expect(result.groups[0].suggestionBlockedReason).toContain('unsupported conditions or actions');
  });

  it('chooses the most specific compatible related rule deterministically', () => {
    const result = buildUncategorizedAudit({
      transactions: [
        {
          id: 'uncat-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-03-18',
          amount: -9900,
          payee: 'payee-amazon',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: null,
        },
        {
          id: 'peer-1',
          account: 'acc-1',
          account_name: 'Checking',
          date: '2026-02-18',
          amount: -10100,
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
          date: '2026-01-18',
          amount: -9800,
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
          date: '2025-12-18',
          amount: -10300,
          payee: 'payee-amazon',
          payee_name: 'Amazon',
          imported_payee: 'AMZN Mktp US',
          category: 'cat-shopping',
          category_name: 'Shopping',
        },
      ],
      rules: [
        makeRule({
          id: 'rule-payee',
          stage: 'default',
          conditionsOp: 'and',
          conditions: [
            { field: 'account', op: 'is', value: 'acc-1' },
            { field: 'payee', op: 'is', value: 'payee-amazon' },
          ],
          actions: [{ field: 'category', op: 'set', value: 'cat-old' }],
        }),
        makeRule({
          id: 'rule-imported',
          stage: 'default',
          conditionsOp: 'and',
          conditions: [
            { field: 'account', op: 'is', value: 'acc-1' },
            { field: 'imported_payee', op: 'is', value: 'AMZN Mktp US' },
          ],
          actions: [{ field: 'category', op: 'set', value: 'cat-old' }],
        }),
      ],
      categoriesById: {
        'cat-old': { id: 'cat-old', name: 'Old', group_id: 'group-1' },
        'cat-shopping': { id: 'cat-shopping', name: 'Shopping', group_id: 'group-1' },
      },
      startDate: '2025-12-01',
      endDate: '2026-03-25',
      accountScope: 'all-on-budget',
    });

    expect(result.groups[0].relatedRules.map((rule) => rule.id)).toEqual([
      'rule-imported',
      'rule-payee',
    ]);
    expect(result.groups[0].suggestedRule).toMatchObject({
      mode: 'update-rule',
      targetRuleId: 'rule-imported',
    });
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
