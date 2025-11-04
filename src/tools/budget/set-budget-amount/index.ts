// ----------------------------
// SET BUDGET AMOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetAmount } from '../../../actual-api.js';
import { assertMonth, assertPositiveIntegerCents, assertUuid } from '../../../utils/validators.js';

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
    const month = assertMonth(args.month, 'month');
    const categoryId = assertUuid(args.categoryId, 'categoryId');
    const amount = assertPositiveIntegerCents(args.amount, 'amount');

    await setBudgetAmount(month, categoryId, amount);

    return successWithJson(
      `Successfully set budget amount of ${amount} for category ${categoryId} in month ${month}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
