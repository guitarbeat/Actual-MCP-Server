// ----------------------------
// CREATE RULE TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { RuleHandler } from '../../manage-entity/entity-handlers/rule-handler.js';
import type { RuleData } from '../../manage-entity/types.js';
import { RuleDataSchema } from '../../manage-entity/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolInput } from '../../../types.js';

export const schema = {
  name: 'create-rule',
  description:
    'Create a new auto-categorization rule in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- conditionsOp: How to combine conditions ("and" or "or")\n' +
    '- conditions: Array of rule conditions (at least one required)\n' +
    '- actions: Array of rule actions (at least one required)\n\n' +
    'OPTIONAL:\n' +
    '- stage: Rule stage ("pre" or "post", default: null)\n\n' +
    'CONDITION FIELDS:\n' +
    '- field: account, category, date, payee, amount, imported_payee\n' +
    '- op: is, isNot, oneOf, notOneOf, contains, etc.\n' +
    '- value: string, number, or array\n\n' +
    'ACTION FIELDS:\n' +
    '- field: account, category, date, payee, amount, cleared, notes, or null\n' +
    '- op: set, prepend-notes, append-notes, set-split-amount\n' +
    '- value: boolean, string, number, or null\n\n' +
    'EXAMPLES:\n' +
    '- Auto-categorize by payee: {"conditionsOp": "and", "conditions": [{"field": "payee", "op": "is", "value": "payee-id"}], "actions": [{"field": "category", "op": "set", "value": "category-id"}]}\n' +
    '- Multiple conditions: {"conditionsOp": "or", "conditions": [{"field": "payee", "op": "contains", "value": "Amazon"}, {"field": "payee", "op": "contains", "value": "AWS"}], "actions": [{"field": "category", "op": "set", "value": "category-id"}]}\n\n' +
    'COMMON USE CASES:\n' +
    '- Auto-categorize transactions by payee\n' +
    '- Set default categories for accounts\n' +
    '- Add notes to transactions\n' +
    '- Automate transaction processing\n\n' +
    'SEE ALSO:\n' +
    '- Use get-rules to list all rules\n' +
    '- Use update-rule to modify rules\n' +
    '- Use delete-rule to remove rules\n\n' +
    'NOTES:\n' +
    '- Rules are processed in order (pre-stage then post-stage)\n' +
    '- Conditions are combined using conditionsOp (and/or)\n' +
    '- Actions are executed when all conditions match',
  inputSchema: zodToJsonSchema(RuleDataSchema) as ToolInput,
};

export async function handler(args: RuleData): Promise<MCPResponse> {
  try {
    const validated = RuleDataSchema.parse(args);
    const handler = new RuleHandler();
    const ruleId = await handler.create(validated);
    handler.invalidateCache();
    return success(`Successfully created rule with id ${ruleId}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to create rule',
    });
  }
}
