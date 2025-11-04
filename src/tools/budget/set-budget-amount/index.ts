// ----------------------------
// SET BUDGET AMOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetAmount } from '../../../actual-api.js';
import { setBudgetAmountArgsSchema, type SetBudgetAmountArgs } from './types.js';

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
  args: SetBudgetAmountArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = setBudgetAmountArgsSchema.parse(args);

    await setBudgetAmount(parsedArgs.month, parsedArgs.categoryId, parsedArgs.amount);

    return successWithJson(
      `Successfully set budget amount of ${parsedArgs.amount} for category ${parsedArgs.categoryId} in month ${parsedArgs.month}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
