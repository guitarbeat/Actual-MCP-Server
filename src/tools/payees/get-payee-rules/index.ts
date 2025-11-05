// ----------------------------
// GET PAYEE RULES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { getPayeeRules } from '../../../actual-api.js';

export const schema = {
  name: 'get-payee-rules',
  description:
    'Retrieve all auto-categorization rules associated with a specific payee. Shows which rules will automatically categorize transactions from this payee.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- payeeId: Payee UUID\n\n' +
    'RETURNED DATA:\n' +
    '- Rule IDs and details\n' +
    '- Conditions that trigger the rule\n' +
    '- Actions applied when rule matches\n' +
    '- Rule stage (pre or post)\n\n' +
    'EXAMPLE:\n' +
    '{"payeeId": "abc123-def456"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Checking which rules apply to a payee\n' +
    '- Debugging auto-categorization behavior\n' +
    '- Reviewing rules before creating new ones\n\n' +
    'NOTES:\n' +
    '- Use get-payees to find payee IDs\n' +
    '- Returns empty array if no rules exist for payee\n' +
    '- Rules may have multiple conditions and actions\n' +
    '- Use get-rules to see all rules in the system\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-payees to find payee ID\n' +
    '2. Use get-payee-rules to see existing rules for that payee\n' +
    '3. Use manage-entity to create or update rules if needed\n\n' +
    'SEE ALSO:\n' +
    '- get-payees: Find payee IDs\n' +
    '- get-rules: View all rules in the system\n' +
    '- manage-entity: Create or update rules',
  inputSchema: {
    type: 'object',
    properties: {
      payeeId: {
        type: 'string',
        description:
          'ID of the payee to retrieve rules for. Must be a valid payee UUID. Use get-payees to find payee IDs. Returns all auto-categorization rules that apply to this payee.',
      },
    },
    required: ['payeeId'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.payeeId || typeof args.payeeId !== 'string') {
      return errorFromCatch('payeeId is required and must be a string');
    }

    const rules = await getPayeeRules(args.payeeId as string);

    return successWithJson(rules);
  } catch (err) {
    return errorFromCatch(err);
  }
}
