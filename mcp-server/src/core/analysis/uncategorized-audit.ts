import type { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { fetchAllCategoriesMap } from '../data/fetch-categories.js';
import {
  fetchAllOnBudgetTransactionsWithMetadata,
  fetchTransactionsForAccount,
} from '../data/fetch-transactions.js';
import { fetchAllRules } from '../data/fetch-rules.js';
import { formatDate } from '../formatting/index.js';
import type { Category, Transaction } from '../types/domain.js';
import { nameResolver } from '../utils/name-resolver.js';
import type { RuleAction, RuleCondition, RuleData } from '../../tools/manage-entity/types.js';

export const ALL_HISTORY_START_DATE = '1900-01-01';
export const DEFAULT_GROUP_LIMIT = 25;
export const DEFAULT_SAMPLE_PER_GROUP = 5;
export const DEFAULT_EXCLUDE_TRANSFERS = true;
export const MIN_HINT_PEERS = 3;
export const MIN_HINT_CONFIDENCE = 0.8;

type ActualRuleCondition = NonNullable<RuleEntity['conditions']>[number];
type ActualRuleAction = NonNullable<RuleEntity['actions']>[number];

export type UncategorizedGroupSource = 'imported_payee' | 'payee';
export type SuggestedAction = 'create-rule' | 'update-rule' | 'manual-review';
export type RuleMatchType =
  | 'imported_payee:is'
  | 'imported_payee:oneOf'
  | 'imported_payee:contains'
  | 'imported_payee:matches'
  | 'payee:is'
  | 'payee:oneOf';

export interface SuggestedRulePlan {
  mode: 'create-rule' | 'update-rule';
  targetRuleId?: string;
  payload: RuleData;
  reason: string;
}

export interface HistoricalCategoryHint {
  categoryId: string;
  categoryName: string;
  matchingPeerCount: number;
  categorizedPeerCount: number;
  confidence: number;
}

export interface RelatedRuleSummary {
  id: string;
  stage?: string | null;
  matchField: 'payee' | 'imported_payee';
  ruleMatchType: RuleMatchType;
  categoryActionValue?: string;
  categoryActionName?: string;
}

export interface UncategorizedAuditSample {
  id: string;
  date: string;
  amount: number;
  payee?: string | null;
  imported_payee?: string | null;
  notes?: string | null;
}

export interface UncategorizedAuditGroup {
  groupSource: UncategorizedGroupSource;
  groupLabel: string;
  accountId: string;
  accountName: string;
  uncategorizedCount: number;
  uncategorizedTotalAmount: number;
  oldestDate: string;
  newestDate: string;
  sampleTransactionIds: string[];
  sampleTransactions: UncategorizedAuditSample[];
  relatedRules: RelatedRuleSummary[];
  historicalCategoryHint: HistoricalCategoryHint | null;
  suggestedAction: SuggestedAction;
  suggestedRule: SuggestedRulePlan | null;
  suggestionBlockedReason?: string;
}

export interface UncategorizedAuditSummary {
  startDate: string;
  endDate: string;
  excludedTransfers: boolean;
  accountScope: 'all-on-budget' | 'single-account';
  accountId?: string;
  accountName?: string;
  totalTransactionsAnalyzed: number;
  uncategorizedTransactionCount: number;
  uncategorizedTransactionTotalAmount: number;
  totalGroupCount: number;
  returnedGroupCount: number;
  ruleOpportunityCount: number;
  manualReviewGroupCount: number;
  warningCount: number;
}

export interface UncategorizedAuditResult {
  summary: UncategorizedAuditSummary;
  groups: UncategorizedAuditGroup[];
  warnings: string[];
}

export interface BuildUncategorizedAuditOptions {
  transactions: Transaction[];
  rules: RuleEntity[];
  categoriesById: Record<string, Category>;
  startDate: string;
  endDate: string;
  accountScope: UncategorizedAuditSummary['accountScope'];
  accountId?: string;
  accountName?: string;
  excludeTransfers?: boolean;
  groupLimit?: number;
  samplePerGroup?: number;
  warnings?: string[];
}

export interface AuditUncategorizedTransactionsOptions {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  excludeTransfers?: boolean;
  groupLimit?: number;
  samplePerGroup?: number;
}

interface GroupIdentity {
  key: string;
  groupSource: UncategorizedGroupSource;
  groupLabel: string;
  accountId: string;
  accountName: string;
  payeeIds: Set<string>;
}

interface CategoryCounter {
  categoryId: string;
  categoryName: string;
  count: number;
}

interface InternalRelatedRule extends RelatedRuleSummary {
  rule: RuleEntity;
  accountScoped: boolean;
  unsupportedConditions: string[];
  unsupportedActions: string[];
  categoryActionValues: string[];
  matchScore: number;
}

interface Cluster {
  identity: GroupIdentity;
  transactions: Transaction[];
}

interface ConditionCompatibility {
  status: 'match' | 'compatible' | 'incompatible' | 'unsupported';
  matchType?: RuleMatchType;
  accountScoped?: boolean;
  reason?: string;
}

function toLowerTrimmed(value: string): string {
  return value.trim().toLowerCase();
}

function getAuditEndDate(endDate?: string): string {
  return endDate ?? formatDate(new Date());
}

export function resolveAuditDateRange(
  startDate?: string,
  endDate?: string,
): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: startDate ?? ALL_HISTORY_START_DATE,
    endDate: getAuditEndDate(endDate),
  };
}

function getGroupIdentity(transaction: Transaction): GroupIdentity {
  const importedPayee = transaction.imported_payee?.trim();
  const payeeLabel = transaction.payee_name?.trim() || transaction.payee?.trim() || '(No payee)';
  const groupSource: UncategorizedGroupSource = importedPayee ? 'imported_payee' : 'payee';
  const groupLabel = importedPayee || payeeLabel;
  const accountId = transaction.account;
  const accountName = transaction.account_name || transaction.account || 'Unknown Account';
  const normalizedLabel = toLowerTrimmed(groupLabel);

  return {
    key: `${groupSource}:${normalizedLabel}:${accountId}`,
    groupSource,
    groupLabel,
    accountId,
    accountName,
    payeeIds: transaction.payee ? new Set([transaction.payee]) : new Set<string>(),
  };
}

function annotateAccountNames(
  transactions: Transaction[],
  accountsById: Record<string, { name: string }>,
): Transaction[] {
  return transactions.map((transaction) => ({
    ...transaction,
    account_name:
      transaction.account_name || accountsById[transaction.account]?.name || transaction.account,
  }));
}

function shouldExcludeTransfer(transaction: Transaction): boolean {
  return Boolean(transaction.transfer_id || transaction.is_parent || transaction.is_child);
}

function getSiblingKey(identity: GroupIdentity): string {
  return `${identity.groupSource}:${toLowerTrimmed(identity.groupLabel)}`;
}

function categoryActionValue(action: ActualRuleAction): string | undefined {
  if (!('field' in action) || action.field !== 'category') {
    return undefined;
  }

  if (action.op !== 'set' || typeof action.value !== 'string') {
    return undefined;
  }

  return action.value;
}

function getCategoryActionValues(rule: RuleEntity): string[] {
  return (rule.actions ?? [])
    .map(categoryActionValue)
    .filter((value): value is string => value !== undefined);
}

function getMatchScore(matchType: RuleMatchType): number {
  switch (matchType) {
    case 'imported_payee:is':
      return 600;
    case 'imported_payee:oneOf':
      return 500;
    case 'payee:is':
      return 400;
    case 'payee:oneOf':
      return 300;
    case 'imported_payee:contains':
      return 200;
    case 'imported_payee:matches':
      return 100;
    default:
      return 0;
  }
}

function evaluateAccountCondition(
  condition: ActualRuleCondition,
  identity: GroupIdentity,
): ConditionCompatibility {
  if (condition.field !== 'account') {
    return { status: 'unsupported' };
  }

  if (condition.op === 'is' && typeof condition.value === 'string') {
    if (condition.value !== identity.accountId) {
      return { status: 'incompatible', reason: 'Existing rule scopes to a different account.' };
    }

    return { status: 'compatible', accountScoped: true };
  }

  if (condition.op === 'oneOf' && Array.isArray(condition.value)) {
    const accountIds = condition.value.filter(
      (value): value is string => typeof value === 'string',
    );

    if (!accountIds.includes(identity.accountId)) {
      return {
        status: 'incompatible',
        reason: 'Existing rule scopes to a different set of accounts.',
      };
    }

    return { status: 'compatible', accountScoped: accountIds.length === 1 };
  }

  return {
    status: 'unsupported',
    reason: `Unsupported account condition: ${condition.op}`,
  };
}

function evaluatePayeeCondition(
  condition: ActualRuleCondition,
  payeeIds: Set<string>,
): ConditionCompatibility {
  if (condition.field !== 'payee') {
    return { status: 'unsupported' };
  }

  if (payeeIds.size === 0) {
    return {
      status: 'incompatible',
      reason: 'Cluster does not have resolved payee IDs for payee-based rule matching.',
    };
  }

  if (condition.op === 'is' && typeof condition.value === 'string') {
    if (!payeeIds.has(condition.value)) {
      return {
        status: 'incompatible',
        reason: 'Existing payee condition does not match this cluster.',
      };
    }

    return { status: 'match', matchType: 'payee:is' };
  }

  if (condition.op === 'oneOf' && Array.isArray(condition.value)) {
    const hasMatch = condition.value.some(
      (value): value is string => typeof value === 'string' && payeeIds.has(value),
    );

    if (!hasMatch) {
      return {
        status: 'incompatible',
        reason: 'Existing payee rule does not include this cluster payee.',
      };
    }

    return { status: 'match', matchType: 'payee:oneOf' };
  }

  return {
    status: 'unsupported',
    reason: `Unsupported payee condition: ${condition.op}`,
  };
}

function evaluateImportedPayeeCondition(
  condition: ActualRuleCondition,
  identity: GroupIdentity,
): ConditionCompatibility {
  if (condition.field !== 'imported_payee') {
    return { status: 'unsupported' };
  }

  if (identity.groupSource !== 'imported_payee') {
    return {
      status: 'incompatible',
      reason: 'Existing imported_payee rule does not match a payee-grouped cluster.',
    };
  }

  const normalizedLabel = toLowerTrimmed(identity.groupLabel);

  if (condition.op === 'is' && typeof condition.value === 'string') {
    if (toLowerTrimmed(condition.value) !== normalizedLabel) {
      return {
        status: 'incompatible',
        reason: 'Existing imported_payee rule targets a different imported payee label.',
      };
    }

    return { status: 'match', matchType: 'imported_payee:is' };
  }

  if (condition.op === 'oneOf' && Array.isArray(condition.value)) {
    const hasMatch = condition.value.some(
      (value): value is string =>
        typeof value === 'string' && toLowerTrimmed(value) === normalizedLabel,
    );

    if (!hasMatch) {
      return {
        status: 'incompatible',
        reason: 'Existing imported_payee rule does not include this cluster label.',
      };
    }

    return { status: 'match', matchType: 'imported_payee:oneOf' };
  }

  if (condition.op === 'contains' && typeof condition.value === 'string') {
    if (!normalizedLabel.includes(toLowerTrimmed(condition.value))) {
      return {
        status: 'incompatible',
        reason: 'Existing imported_payee contains rule does not match this cluster label.',
      };
    }

    return { status: 'match', matchType: 'imported_payee:contains' };
  }

  if (condition.op === 'matches' && typeof condition.value === 'string') {
    try {
      if (!new RegExp(condition.value, 'i').test(identity.groupLabel)) {
        return {
          status: 'incompatible',
          reason: 'Existing imported_payee regex rule does not match this cluster label.',
        };
      }

      return { status: 'match', matchType: 'imported_payee:matches' };
    } catch {
      return {
        status: 'unsupported',
        reason: `Unsupported imported_payee regex: ${condition.value}`,
      };
    }
  }

  return {
    status: 'unsupported',
    reason: `Unsupported imported_payee condition: ${condition.op}`,
  };
}

function evaluateCondition(
  condition: ActualRuleCondition,
  identity: GroupIdentity,
): ConditionCompatibility {
  switch (condition.field) {
    case 'account':
      return evaluateAccountCondition(condition, identity);
    case 'payee':
      return evaluatePayeeCondition(condition, identity.payeeIds);
    case 'imported_payee':
      return evaluateImportedPayeeCondition(condition, identity);
    case 'category':
      return {
        status: 'incompatible',
        reason:
          'Existing rule requires categorized transactions, but this cluster is uncategorized.',
      };
    case 'amount':
    case 'date':
      return {
        status: 'unsupported',
        reason: `Unsupported rule condition field: ${condition.field}`,
      };
    default:
      return {
        status: 'unsupported',
        reason: `Unsupported rule condition field: ${condition.field}`,
      };
  }
}

function summarizeRelatedRules(
  identity: GroupIdentity,
  rules: RuleEntity[],
  categoriesById: Record<string, Category>,
): InternalRelatedRule[] {
  const related: InternalRelatedRule[] = [];

  for (const rule of rules) {
    const conditions = rule.conditions ?? [];

    let bestMatchType: RuleMatchType | null = null;
    let accountScoped = false;
    const unsupportedConditions: string[] = [];
    let incompatible = false;

    for (const condition of conditions) {
      const evaluation = evaluateCondition(condition, identity);

      if (evaluation.status === 'incompatible') {
        incompatible = true;
        break;
      }

      if (evaluation.status === 'unsupported') {
        if (evaluation.reason) {
          unsupportedConditions.push(evaluation.reason);
        }
        continue;
      }

      if (evaluation.accountScoped) {
        accountScoped = true;
      }

      if (
        evaluation.status === 'match' &&
        evaluation.matchType &&
        (!bestMatchType || getMatchScore(evaluation.matchType) > getMatchScore(bestMatchType))
      ) {
        bestMatchType = evaluation.matchType;
      }
    }

    if (incompatible || !bestMatchType) {
      continue;
    }

    const categoryActionValues = getCategoryActionValues(rule);
    const categoryValue = categoryActionValues[0];
    const unsupportedActions = (rule.actions ?? [])
      .map((action) =>
        normalizeRuleAction(action) ? null : `Unsupported rule action: ${action.op}`,
      )
      .filter((reason): reason is string => reason !== null);

    related.push({
      id: rule.id,
      stage: rule.stage,
      matchField: bestMatchType.startsWith('imported_payee') ? 'imported_payee' : 'payee',
      ruleMatchType: bestMatchType,
      categoryActionValue: categoryValue,
      categoryActionName: categoryValue ? categoriesById[categoryValue]?.name : undefined,
      rule,
      accountScoped,
      unsupportedConditions,
      unsupportedActions,
      categoryActionValues,
      matchScore: getMatchScore(bestMatchType),
    });
  }

  return related.sort((left, right) => {
    if (left.accountScoped !== right.accountScoped) {
      return left.accountScoped ? -1 : 1;
    }

    if (left.matchScore !== right.matchScore) {
      return right.matchScore - left.matchScore;
    }

    return left.id.localeCompare(right.id);
  });
}

function inferCategoryHint(categorizedPeers: Transaction[]): HistoricalCategoryHint | null {
  if (categorizedPeers.length < MIN_HINT_PEERS) {
    return null;
  }

  const categoryCounts = new Map<string, CategoryCounter>();

  for (const peer of categorizedPeers) {
    if (!peer.category || !peer.category_name) {
      continue;
    }

    const existing = categoryCounts.get(peer.category);

    if (existing) {
      existing.count += 1;
      continue;
    }

    categoryCounts.set(peer.category, {
      categoryId: peer.category,
      categoryName: peer.category_name,
      count: 1,
    });
  }

  if (categoryCounts.size === 0) {
    return null;
  }

  const sorted = [...categoryCounts.values()].sort((left, right) => right.count - left.count);
  const topCategory = sorted[0];
  const confidence = topCategory.count / categorizedPeers.length;

  if (topCategory.count < MIN_HINT_PEERS || confidence < MIN_HINT_CONFIDENCE) {
    return null;
  }

  return {
    categoryId: topCategory.categoryId,
    categoryName: topCategory.categoryName,
    matchingPeerCount: topCategory.count,
    categorizedPeerCount: categorizedPeers.length,
    confidence,
  };
}

function buildRuleCondition(identity: GroupIdentity): RuleCondition | null {
  if (identity.groupSource === 'imported_payee') {
    return {
      field: 'imported_payee',
      op: 'is',
      value: identity.groupLabel,
    };
  }

  const payeeIds = [...identity.payeeIds];

  if (payeeIds.length === 1) {
    return {
      field: 'payee',
      op: 'is',
      value: payeeIds[0],
    };
  }

  if (payeeIds.length > 1) {
    return {
      field: 'payee',
      op: 'oneOf',
      value: payeeIds,
    };
  }

  return null;
}

function buildAccountScopeCondition(identity: GroupIdentity): RuleCondition {
  return {
    field: 'account',
    op: 'is',
    value: identity.accountId,
  };
}

function createRulePayload(identity: GroupIdentity, hint: HistoricalCategoryHint): RuleData | null {
  const condition = buildRuleCondition(identity);

  if (!condition) {
    return null;
  }

  return {
    conditionsOp: 'and',
    conditions: [buildAccountScopeCondition(identity), condition],
    actions: [
      {
        field: 'category',
        op: 'set',
        value: hint.categoryId,
      },
    ],
  };
}

function normalizeRuleCondition(condition: ActualRuleCondition): RuleCondition | null {
  const supportedFields = new Set<RuleCondition['field']>([
    'account',
    'category',
    'date',
    'payee',
    'amount',
    'imported_payee',
  ]);

  if (!supportedFields.has(condition.field as RuleCondition['field'])) {
    return null;
  }

  const supportedValue =
    typeof condition.value === 'string' ||
    typeof condition.value === 'number' ||
    (Array.isArray(condition.value) &&
      condition.value.every((value) => typeof value === 'string' || typeof value === 'number'));

  if (!supportedValue) {
    return null;
  }

  return {
    field: condition.field as RuleCondition['field'],
    op: condition.op as RuleCondition['op'],
    value: condition.value as RuleCondition['value'],
  };
}

function normalizeRuleAction(action: ActualRuleAction): RuleAction | null {
  if (!('field' in action)) {
    return null;
  }

  const supportedFields = new Set<RuleAction['field']>([
    'account',
    'category',
    'date',
    'payee',
    'amount',
    'cleared',
    'notes',
    null,
  ]);
  const supportedOps = new Set<RuleAction['op']>([
    'set',
    'prepend-notes',
    'append-notes',
    'set-split-amount',
  ]);
  const supportedValue =
    action.value === null ||
    typeof action.value === 'boolean' ||
    typeof action.value === 'string' ||
    typeof action.value === 'number';

  if (
    !supportedFields.has(action.field as RuleAction['field']) ||
    !supportedOps.has(action.op as RuleAction['op']) ||
    !supportedValue
  ) {
    return null;
  }

  const normalized: RuleAction = {
    field: action.field as RuleAction['field'],
    op: action.op as RuleAction['op'],
    value: action.value as RuleAction['value'],
  };

  if ('options' in action && action.options) {
    normalized.options = action.options;
  }

  return normalized;
}

function updateRulePayload(rule: RuleEntity, hint: HistoricalCategoryHint): RuleData {
  const actions = (rule.actions ?? [])
    .map((action) => normalizeRuleAction(action))
    .filter((action): action is RuleAction => action !== null)
    .filter((action) => !(action.field === 'category' && action.op === 'set'));

  actions.push({
    field: 'category',
    op: 'set',
    value: hint.categoryId,
  });

  const stage = rule.stage as RuleData['stage'];

  return {
    stage: stage === 'pre' || stage === 'default' || stage === 'post' ? stage : null,
    conditionsOp: rule.conditionsOp === 'or' ? 'or' : 'and',
    conditions: (rule.conditions ?? [])
      .map((condition) => normalizeRuleCondition(condition))
      .filter((condition): condition is RuleCondition => condition !== null),
    actions,
  };
}

function hasSiblingHintConflict(
  identity: GroupIdentity,
  hint: HistoricalCategoryHint,
  hintsBySiblingKey: Map<string, HistoricalCategoryHint[]>,
): boolean {
  const siblingHints = hintsBySiblingKey.get(getSiblingKey(identity)) ?? [];

  return siblingHints.some((candidate) => candidate.categoryId !== hint.categoryId);
}

function getUpdateBlockedReason(
  relatedRule: InternalRelatedRule,
  hint: HistoricalCategoryHint,
  hasConflictingSiblings: boolean,
): string | null {
  if (relatedRule.unsupportedConditions.length > 0 || relatedRule.unsupportedActions.length > 0) {
    return 'Existing matching rule contains unsupported conditions or actions, so updating it could be lossy.';
  }

  if (relatedRule.categoryActionValues.length === 0) {
    return 'Existing matching rule has no replaceable category action.';
  }

  if (relatedRule.categoryActionValues.length > 1) {
    return 'Existing matching rule has multiple category actions, so there is no single safe category replacement.';
  }

  if (hasConflictingSiblings && !relatedRule.accountScoped) {
    return 'Conflicting category hints exist in other accounts, and the matching rule is not safely account-scoped.';
  }

  if (relatedRule.categoryActionValues[0] === hint.categoryId) {
    return null;
  }

  return null;
}

function chooseSuggestion(
  identity: GroupIdentity,
  hint: HistoricalCategoryHint | null,
  relatedRules: InternalRelatedRule[],
  hasConflictingSiblings: boolean,
): {
  suggestedAction: SuggestedAction;
  suggestedRule: SuggestedRulePlan | null;
  suggestionBlockedReason?: string;
} {
  if (!hint) {
    return { suggestedAction: 'manual-review', suggestedRule: null };
  }

  const matchingCategoryRule = relatedRules.find(
    (rule) => rule.categoryActionValue === hint.categoryId,
  );

  if (matchingCategoryRule) {
    return { suggestedAction: 'manual-review', suggestedRule: null };
  }

  if (relatedRules.length > 0) {
    const updateCandidate = relatedRules.find(
      (rule) => getUpdateBlockedReason(rule, hint, hasConflictingSiblings) === null,
    );

    if (updateCandidate) {
      return {
        suggestedAction: 'update-rule',
        suggestedRule: {
          mode: 'update-rule',
          targetRuleId: updateCandidate.id,
          payload: updateRulePayload(updateCandidate.rule, hint),
          reason: `Existing ${updateCandidate.matchField} rule matches this cluster but does not set ${hint.categoryName}.`,
        },
      };
    }

    const blockedReason =
      getUpdateBlockedReason(relatedRules[0], hint, hasConflictingSiblings) ??
      'Existing matching rule could not be updated safely.';

    return {
      suggestedAction: 'manual-review',
      suggestedRule: null,
      suggestionBlockedReason: blockedReason,
    };
  }

  const payload = createRulePayload(identity, hint);

  if (!payload) {
    return {
      suggestedAction: 'manual-review',
      suggestedRule: null,
      suggestionBlockedReason: 'Could not build a safely scoped rule condition for this cluster.',
    };
  }

  if (
    hasConflictingSiblings &&
    !payload.conditions.some((condition) => condition.field === 'account')
  ) {
    return {
      suggestedAction: 'manual-review',
      suggestedRule: null,
      suggestionBlockedReason:
        'Conflicting category hints exist in other accounts, so only an account-scoped rule would be safe.',
    };
  }

  return {
    suggestedAction: 'create-rule',
    suggestedRule: {
      mode: 'create-rule',
      payload,
      reason: `Historical peers strongly suggest ${hint.categoryName} for this cluster.`,
    },
  };
}

function sortTransactionsNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => right.date.localeCompare(left.date));
}

export function buildUncategorizedAudit(
  options: BuildUncategorizedAuditOptions,
): UncategorizedAuditResult {
  const excludedTransfers = options.excludeTransfers ?? DEFAULT_EXCLUDE_TRANSFERS;
  const groupLimit = options.groupLimit ?? DEFAULT_GROUP_LIMIT;
  const samplePerGroup = options.samplePerGroup ?? DEFAULT_SAMPLE_PER_GROUP;
  const warnings = options.warnings ?? [];
  const filteredTransactions = excludedTransfers
    ? options.transactions.filter((transaction) => !shouldExcludeTransfer(transaction))
    : [...options.transactions];

  const uncategorized = filteredTransactions.filter((transaction) => !transaction.category);
  const categorized = filteredTransactions.filter((transaction) => Boolean(transaction.category));
  const categorizedByKey = new Map<string, Transaction[]>();

  for (const transaction of categorized) {
    const identity = getGroupIdentity(transaction);
    const existing = categorizedByKey.get(identity.key);

    if (existing) {
      existing.push(transaction);
    } else {
      categorizedByKey.set(identity.key, [transaction]);
    }
  }

  const uncategorizedByKey = new Map<string, Cluster>();

  for (const transaction of uncategorized) {
    const identity = getGroupIdentity(transaction);
    const existing = uncategorizedByKey.get(identity.key);

    if (existing) {
      existing.transactions.push(transaction);
      identity.payeeIds.forEach((payeeId) => existing.identity.payeeIds.add(payeeId));
      continue;
    }

    uncategorizedByKey.set(identity.key, {
      identity,
      transactions: [transaction],
    });
  }

  const hintsByGroupKey = new Map<string, HistoricalCategoryHint | null>();

  for (const [key, categorizedPeers] of categorizedByKey.entries()) {
    hintsByGroupKey.set(key, inferCategoryHint(categorizedPeers));
  }

  const hintsBySiblingKey = new Map<string, HistoricalCategoryHint[]>();

  for (const cluster of uncategorizedByKey.values()) {
    const hint = hintsByGroupKey.get(cluster.identity.key) ?? null;

    if (!hint) {
      continue;
    }

    const siblingKey = getSiblingKey(cluster.identity);
    const existing = hintsBySiblingKey.get(siblingKey);

    if (existing) {
      existing.push(hint);
      continue;
    }

    hintsBySiblingKey.set(siblingKey, [hint]);
  }

  const allGroups = [...uncategorizedByKey.values()]
    .map((cluster) => {
      const sortedTransactions = sortTransactionsNewestFirst(cluster.transactions);
      const relatedRules = summarizeRelatedRules(
        cluster.identity,
        options.rules,
        options.categoriesById,
      );
      const hint = hintsByGroupKey.get(cluster.identity.key) ?? null;
      const hasConflictingSiblings = hint
        ? hasSiblingHintConflict(cluster.identity, hint, hintsBySiblingKey)
        : false;
      const { suggestedAction, suggestedRule, suggestionBlockedReason } = chooseSuggestion(
        cluster.identity,
        hint,
        relatedRules,
        hasConflictingSiblings,
      );

      return {
        groupSource: cluster.identity.groupSource,
        groupLabel: cluster.identity.groupLabel,
        accountId: cluster.identity.accountId,
        accountName: cluster.identity.accountName,
        uncategorizedCount: sortedTransactions.length,
        uncategorizedTotalAmount: sortedTransactions.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        ),
        oldestDate: [...sortedTransactions].reverse()[0]?.date ?? options.startDate,
        newestDate: sortedTransactions[0]?.date ?? options.endDate,
        sampleTransactionIds: sortedTransactions
          .slice(0, samplePerGroup)
          .map((transaction) => transaction.id),
        sampleTransactions: sortedTransactions.slice(0, samplePerGroup).map((transaction) => ({
          id: transaction.id,
          date: transaction.date,
          amount: transaction.amount,
          payee: transaction.payee_name || transaction.payee || null,
          imported_payee: transaction.imported_payee ?? null,
          notes: transaction.notes ?? null,
        })),
        relatedRules: relatedRules.map(({ rule: _rule, ...summary }) => summary),
        historicalCategoryHint: hint,
        suggestedAction,
        suggestedRule,
        ...(suggestionBlockedReason ? { suggestionBlockedReason } : {}),
      } satisfies UncategorizedAuditGroup;
    })
    .sort((left, right) => {
      if (right.uncategorizedCount !== left.uncategorizedCount) {
        return right.uncategorizedCount - left.uncategorizedCount;
      }

      return right.newestDate.localeCompare(left.newestDate);
    });

  const returnedGroups = allGroups.slice(0, groupLimit);
  const totalAmount = uncategorized.reduce((sum, transaction) => sum + transaction.amount, 0);
  const ruleOpportunityCount = allGroups.filter(
    (group) => group.suggestedAction === 'create-rule' || group.suggestedAction === 'update-rule',
  ).length;
  const manualReviewGroupCount = allGroups.filter(
    (group) => group.suggestedAction === 'manual-review',
  ).length;

  return {
    summary: {
      startDate: options.startDate,
      endDate: options.endDate,
      excludedTransfers,
      accountScope: options.accountScope,
      ...(options.accountId ? { accountId: options.accountId } : {}),
      ...(options.accountName ? { accountName: options.accountName } : {}),
      totalTransactionsAnalyzed: filteredTransactions.length,
      uncategorizedTransactionCount: uncategorized.length,
      uncategorizedTransactionTotalAmount: totalAmount,
      totalGroupCount: allGroups.length,
      returnedGroupCount: returnedGroups.length,
      ruleOpportunityCount,
      manualReviewGroupCount,
      warningCount: warnings.length,
    },
    groups: returnedGroups,
    warnings,
  };
}

export async function auditUncategorizedTransactions(
  options: AuditUncategorizedTransactionsOptions = {},
): Promise<UncategorizedAuditResult> {
  const excludedTransfers = options.excludeTransfers ?? DEFAULT_EXCLUDE_TRANSFERS;
  const groupLimit = options.groupLimit ?? DEFAULT_GROUP_LIMIT;
  const samplePerGroup = options.samplePerGroup ?? DEFAULT_SAMPLE_PER_GROUP;
  const { startDate, endDate } = resolveAuditDateRange(options.startDate, options.endDate);
  const accounts = await fetchAllAccounts();
  const accountsById = Object.fromEntries(accounts.map((account) => [account.id, account]));
  const [rules, categoriesById] = await Promise.all([fetchAllRules(), fetchAllCategoriesMap()]);

  if (options.accountId) {
    const resolvedAccountId = await nameResolver.resolveAccount(options.accountId);
    const accountName = accountsById[resolvedAccountId]?.name ?? options.accountId;
    const transactions = annotateAccountNames(
      await fetchTransactionsForAccount(resolvedAccountId, startDate, endDate, {
        accountIdIsResolved: true,
      }),
      accountsById,
    );

    return buildUncategorizedAudit({
      transactions,
      rules,
      categoriesById,
      startDate,
      endDate,
      accountScope: 'single-account',
      accountId: resolvedAccountId,
      accountName,
      excludeTransfers: excludedTransfers,
      groupLimit,
      samplePerGroup,
    });
  }

  const result = await fetchAllOnBudgetTransactionsWithMetadata(accounts, startDate, endDate);
  const warnings = result.warnings.map(
    (warning) =>
      `${warning.accountName} (${warning.accountId}): ${warning.operation} fetch failed - ${warning.error}`,
  );

  return buildUncategorizedAudit({
    transactions: annotateAccountNames(result.transactions, accountsById),
    rules,
    categoriesById,
    startDate,
    endDate,
    accountScope: 'all-on-budget',
    excludeTransfers: excludedTransfers,
    groupLimit,
    samplePerGroup,
    warnings,
  });
}
