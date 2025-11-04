// ----------------------------
// SET BUDGET CARRYOVER TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetCarryover } from '../../../actual-api.js';
import { assertMonth, assertUuid } from '../../../utils/validators.js';

export const schema = {
  name: 'set-budget-carryover',
  description: 'Enable or disable budget carryover for a category in a specific month',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Month in YYYY-MM format',
      },
      categoryId: {
        type: 'string',
        description: 'ID of the category',
      },
      enabled: {
        type: 'boolean',
        description: 'Whether to enable carryover',
      },
    },
    required: ['month', 'categoryId', 'enabled'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (args.enabled === undefined || typeof args.enabled !== 'boolean') {
      return errorFromCatch('enabled is required and must be a boolean');
    }

    const month = assertMonth(args.month, 'month');
    const categoryId = assertUuid(args.categoryId, 'categoryId');

    await setBudgetCarryover(month, categoryId, args.enabled as boolean);

    return successWithJson(
      `Successfully ${args.enabled ? 'enabled' : 'disabled'} budget carryover for category ${categoryId} in month ${month}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
