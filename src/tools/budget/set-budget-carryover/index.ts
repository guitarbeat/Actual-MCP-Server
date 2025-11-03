// ----------------------------
// SET BUDGET CARRYOVER TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetCarryover } from '../../../actual-api.js';

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
    if (!args.month || typeof args.month !== 'string') {
      return errorFromCatch('month is required and must be a string in YYYY-MM format');
    }
    if (!args.categoryId || typeof args.categoryId !== 'string') {
      return errorFromCatch('categoryId is required and must be a string');
    }
    if (args.enabled === undefined || typeof args.enabled !== 'boolean') {
      return errorFromCatch('enabled is required and must be a boolean');
    }

    await setBudgetCarryover(args.month as string, args.categoryId as string, args.enabled as boolean);

    return successWithJson(
      `Successfully ${args.enabled ? 'enabled' : 'disabled'} budget carryover for category ${args.categoryId} in month ${args.month}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
