// ----------------------------
// SET BUDGET AMOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetAmount } from '../../../actual-api.js';

export const schema = {
  name: 'set-budget-amount',
  description: 'Set the budgeted amount for a category in a specific month',
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
      amount: {
        type: 'number',
        description: 'Budgeted amount to set',
      },
    },
    required: ['month', 'categoryId', 'amount'],
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
    if (args.amount === undefined || typeof args.amount !== 'number') {
      return errorFromCatch('amount is required and must be a number');
    }

    await setBudgetAmount(args.month as string, args.categoryId as string, args.amount as number);

    return successWithJson(
      `Successfully set budget amount of ${args.amount} for category ${args.categoryId} in month ${args.month}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
