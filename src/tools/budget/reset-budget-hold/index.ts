// ----------------------------
// RESET BUDGET HOLD TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { resetBudgetHold } from '../../../actual-api.js';

export const schema = {
  name: 'reset-budget-hold',
  description: 'Reset the budget hold for a category',
  inputSchema: {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        description: 'ID of the category',
      },
    },
    required: ['categoryId'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.categoryId || typeof args.categoryId !== 'string') {
      return errorFromCatch('categoryId is required and must be a string');
    }

    await resetBudgetHold(args.categoryId as string);

    return successWithJson('Successfully reset budget hold for category ' + args.categoryId);
  } catch (err) {
    return errorFromCatch(err);
  }
}
