// ----------------------------
// HOLD BUDGET FOR NEXT MONTH TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { holdBudgetForNextMonth } from '../../../actual-api.js';

export const schema = {
  name: 'hold-budget-for-next-month',
  description: 'Hold or release budget funds for the next month',
  inputSchema: {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        description: 'ID of the category',
      },
      hold: {
        type: 'boolean',
        description: 'Whether to hold the budget for next month',
      },
    },
    required: ['categoryId', 'hold'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.categoryId || typeof args.categoryId !== 'string') {
      return errorFromCatch('categoryId is required and must be a string');
    }
    if (args.hold === undefined || typeof args.hold !== 'boolean') {
      return errorFromCatch('hold is required and must be a boolean');
    }

    await holdBudgetForNextMonth(args.categoryId as string, args.hold as boolean);

    return successWithJson(
      `Successfully ${args.hold ? 'held' : 'released'} budget for next month for category ${args.categoryId}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
