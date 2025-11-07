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
    'Retrieve all auto-categorization rules with optional filtering.\n\n' +
    'OPTIONAL FILTERS:\n' +
    '- payeeId: Filter rules that match a specific payee\n' +
    '- categoryId: Filter rules that match a specific category\n' +
    '- limit: Maximum number of rules to return\n\n' +
    'EXAMPLES:\n' +
    '- Get all: {}\n' +
    '- Filter by payee: {"payeeId": "abc123", "limit": 10}\n' +
    '- Filter by category: {"categoryId": "def456"}\n\n' +
    'COMMON USE CASES:\n' +
    '- View all auto-categorization rules\n' +
    '- Find rules that apply to specific payees\n' +
    '- Find rules that categorize to specific categories\n' +
    '- Understand how transactions are automatically categorized\n' +
    '- Review rule conditions and actions\n\n' +
    'SEE ALSO:\n' +
    '- Use with manage-entity to create, update, or delete rules\n' +
    '- Use with get-payees to find payee IDs for filtering\n' +
    '- Use with get-grouped-categories to find category IDs for filtering\n\n' +
    'RETURNS:\n' +
    '- Rule ID, conditions, actions, stage\n' +
    '- Rules automatically categorize transactions',
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
    let rules: RuleEntity[] = await fetchAllRules();

    // Filter by payeeId if provided
    if (args.payeeId) {
      if (typeof args.payeeId !== 'string') {
        return errorFromCatch('payeeId must be a string');
      }
      rules = rules.filter((rule) => ruleMatchesPayee(rule, args.payeeId as string));
    }

    // Filter by categoryId if provided
    if (args.categoryId) {
      if (typeof args.categoryId !== 'string') {
        return errorFromCatch('categoryId must be a string');
      }
      rules = rules.filter((rule) => ruleMatchesCategory(rule, args.categoryId as string));
    }

    // Apply limit if provided
    if (args.limit !== undefined) {
      if (typeof args.limit !== 'number' || args.limit < 1) {
        return errorFromCatch('limit must be a positive number');
      }
      rules = rules.slice(0, args.limit);
    }

    return successWithJson(rules);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to retrieve rules',
      suggestion: 'Check the Actual Budget server logs and verify the provided arguments before retrying.',
    });
  }
}
