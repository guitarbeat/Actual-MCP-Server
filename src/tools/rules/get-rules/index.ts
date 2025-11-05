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
    'Retrieve all auto-categorization rules in the system. Rules automatically categorize transactions based on conditions like payee, amount, or account.\n\n' +
    'RETURNED DATA:\n' +
    '- Rule ID (UUID) - Use this to update or delete rules\n' +
    '- Rule conditions (what triggers the rule)\n' +
    '- Rule actions (what the rule does when triggered)\n' +
    '- Rule stage (pre or post - when rule runs)\n' +
    '- Conditions operator (and/or - how conditions are combined)\n\n' +
    'EXAMPLE:\n' +
    '- Get all rules: {} or no arguments\n\n' +
    'COMMON USE CASES:\n' +
    '- Reviewing existing auto-categorization rules\n' +
    '- Finding rule IDs before updating or deleting with manage-entity\n' +
    '- Understanding why transactions are auto-categorized\n' +
    '- Checking for duplicate or conflicting rules\n\n' +
    'NOTES:\n' +
    '- No parameters required\n' +
    '- Amounts in rules are in cents (e.g., 5000 = $50.00)\n' +
    '- Positive amounts = deposits/income, negative = payments/expenses\n' +
    '- Rules can have multiple conditions (combined with AND or OR)\n' +
    '- Rules can have multiple actions (applied sequentially)\n' +
    '- Use get-payee-rules to see rules for a specific payee\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-rules to see all existing rules\n' +
    '2. Use manage-entity to create, update, or delete rules\n' +
    '3. Use get-transactions to verify rules are working correctly\n\n' +
    'SEE ALSO:\n' +
    '- manage-entity: Create, update, or delete rules\n' +
    '- get-payee-rules: View rules for a specific payee\n' +
    '- get-payees: Find payee IDs for rule conditions\n' +
    '- get-grouped-categories: Find category IDs for rule actions',
  inputSchema: {
    type: 'object',
    description:
      'This tool does not accept any arguments. Returns all auto-categorization rules with their conditions and actions. Note: amounts in rules are in cents (e.g., 5000 = $50.00), positive for deposits, negative for payments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const rules: RuleEntity[] = await fetchAllRules();

    return successWithJson(rules);
  } catch (err) {
    return errorFromCatch(err);
  }
}
