// ----------------------------
// HOLD BUDGET FOR NEXT MONTH TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { holdBudgetForNextMonth } from '../../../actual-api.js';
import { holdBudgetForNextMonthArgsSchema, type HoldBudgetForNextMonthArgs } from './types.js';

export const schema = {
  name: 'hold-budget-for-next-month',
  description: 'Hold a budget amount for the next month',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Month in YYYY-MM format',
      },
      amount: {
        type: 'number',
        description: 'Amount to hold for the next month',
      },
    },
    required: ['month', 'amount'],
  },
};

export async function handler(
  args: HoldBudgetForNextMonthArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = holdBudgetForNextMonthArgsSchema.parse(args);

    await holdBudgetForNextMonth(parsedArgs.month, parsedArgs.amount);

    return successWithJson(
      `Successfully held budget amount of ${parsedArgs.amount} for next month in ${parsedArgs.month}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
