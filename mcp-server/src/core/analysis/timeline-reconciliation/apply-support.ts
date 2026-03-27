import type { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import type { Transaction } from '../../types/domain.js';
import type { RuleCondition, RuleData } from '../../../tools/manage-entity/types.js';
import type { CurrentTransactionSnapshot, TimelineReconCandidate } from './types.js';

export function buildCurrentTransactionMap(
  transactions: Transaction[],
): Map<string, CurrentTransactionSnapshot> {
  return new Map(
    transactions.map((transaction) => [
      transaction.id,
      {
        id: transaction.id,
        date: transaction.date,
        amountCents: transaction.amount,
        payeeName: transaction.payee_name ?? '',
        importedPayee: transaction.imported_payee ?? null,
        categoryName: transaction.category_name ?? null,
        notes: transaction.notes ?? null,
        isParent: Boolean(transaction.is_parent),
        isChild: Boolean(transaction.is_child),
        transferId: transaction.transfer_id ?? null,
      },
    ]),
  );
}

export function buildRulePayload(
  candidate: TimelineReconCandidate,
  categoryId: string,
): RuleData | null {
  if (!candidate.ruleField || !candidate.ruleValue) {
    return null;
  }

  const conditions: RuleCondition[] = [
    {
      field: 'account',
      op: 'is',
      value: candidate.accountId,
    },
    {
      field: candidate.ruleField,
      op: 'is',
      value: candidate.ruleValue,
    },
  ];

  return {
    stage: 'default',
    conditionsOp: 'and',
    conditions,
    actions: [
      {
        field: 'category',
        op: 'set',
        value: categoryId,
      },
    ],
  };
}

export function hasExistingExactRule(
  rules: RuleEntity[],
  candidate: TimelineReconCandidate,
  categoryId: string,
): boolean {
  if (!candidate.ruleField || !candidate.ruleValue) {
    return true;
  }

  return rules.some((rule) => {
    const conditions = rule.conditions ?? [];
    const actions = rule.actions ?? [];
    const hasAccountCondition = conditions.some(
      (condition) =>
        condition.field === 'account' &&
        condition.op === 'is' &&
        condition.value === candidate.accountId,
    );
    const hasMerchantCondition = conditions.some(
      (condition) =>
        condition.field === candidate.ruleField &&
        condition.op === 'is' &&
        condition.value === candidate.ruleValue,
    );
    const hasCategoryAction = actions.some(
      (action) =>
        'field' in action &&
        action.field === 'category' &&
        action.op === 'set' &&
        action.value === categoryId,
    );

    return hasAccountCondition && hasMerchantCondition && hasCategoryAction;
  });
}
