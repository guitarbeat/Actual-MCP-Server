// ----------------------------
// GET RULES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
// import type { Rule } from '../../../types.js';
import { fetchAllRules } from '../../../core/data/fetch-rules.js';
import { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';

export const schema = {
  name: 'get-rules',
  description:
    'List auto-categorization rules that automatically assign categories to transactions. Use this when the user asks about rules or automatic categorization.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "what rules do I have?"\n' +
    '- User wants to see "auto-categorization rules"\n' +
    '- User asks "how are transactions automatically categorized?"\n' +
    '- User wants to find "rules for [payee/category]"\n' +
    '- User needs to understand why transactions are auto-categorized\n\n' +
    'OPTIONAL:\n' +
    '- payeeId: Filter to rules for specific payee\n' +
    '- categoryId: Filter to rules for specific category\n' +
    '- limit: Max results to return\n\n' +
    'EXAMPLES:\n' +
    '- "Show all rules": {}\n' +
    '- "Rules for payee": {"payeeId": "abc-123"}\n' +
    '- "Rules for category": {"categoryId": "def-456"}\n\n' +
    'RETURNS: Rule IDs, conditions, actions, and stage',
  inputSchema: {
    type: 'object',
    properties: {
      payeeId: {
        type: 'string',
        description: 'Filter rules that have a condition matching this payee ID.',
      },
      categoryId: {
        type: 'string',
        description: 'Filter rules that have a condition matching this category ID.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of rules to return. Applied after filtering.',
      },
    },
    required: [],
  },
};

/**
 * Check if a rule matches a payee ID by checking its conditions
 *
 * @param rule - Rule to check
 * @param payeeId - Payee ID to match
 * @returns True if rule has a condition matching the payee
 */
function ruleMatchesPayee(rule: RuleEntity, payeeId: string): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return false;
  }

  return rule.conditions.some((condition) => {
    if (condition.field === 'payee') {
      // Handle different operators
      if (condition.op === 'is' && condition.value === payeeId) {
        return true;
      }
      if (condition.op === 'oneOf' && Array.isArray(condition.value)) {
        return condition.value.includes(payeeId);
      }
    }
    return false;
  });
}

/**
 * Check if a rule matches a category ID by checking its conditions
 *
 * @param rule - Rule to check
 * @param categoryId - Category ID to match
 * @returns True if rule has a condition matching the category
 */
function ruleMatchesCategory(rule: RuleEntity, categoryId: string): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return false;
  }

  return rule.conditions.some((condition) => {
    if (condition.field === 'category') {
      // Handle different operators
      if (condition.op === 'is' && condition.value === categoryId) {
        return true;
      }
      if (condition.op === 'oneOf' && Array.isArray(condition.value)) {
        return condition.value.includes(categoryId);
      }
    }
    return false;
  });
}

export async function handler(
  args: Record<string, unknown> = {}
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    // Validate payeeId type first if provided
    if (args.payeeId !== undefined && typeof args.payeeId !== 'string') {
      return errorFromCatch('payeeId must be a string');
    }

    // Validate categoryId type if provided
    if (args.categoryId !== undefined && typeof args.categoryId !== 'string') {
      return errorFromCatch('categoryId must be a string');
    }

    // Validate limit type if provided
    if (args.limit !== undefined) {
      if (typeof args.limit !== 'number' || args.limit < 1) {
        return errorFromCatch('limit must be a positive number');
      }
    }

    let rules: RuleEntity[] = await fetchAllRules();

    // Filter by payeeId if provided
    if (args.payeeId) {
      rules = rules.filter((rule) => ruleMatchesPayee(rule, args.payeeId as string));
    }

    // Filter by categoryId if provided
    if (args.categoryId) {
      rules = rules.filter((rule) => ruleMatchesCategory(rule, args.categoryId as string));
    }

    // Apply limit if provided
    if (args.limit !== undefined) {
      rules = rules.slice(0, args.limit as number);
    }

    return successWithJson(rules);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to retrieve rules',
      suggestion: 'Check the Actual Budget server logs and verify the provided arguments before retrying.',
    });
  }
}
