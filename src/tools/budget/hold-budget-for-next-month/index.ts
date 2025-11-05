// ----------------------------
// HOLD BUDGET FOR NEXT MONTH TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { holdBudgetForNextMonth } from '../../../actual-api.js';
import { HoldBudgetForNextMonthArgsSchema, type HoldBudgetForNextMonthArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'hold-budget-for-next-month',
  description: 'Hold a budget amount for the next month',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description:
          'Month in YYYY-MM format (e.g., "2024-01" for January 2024). This is the month from which to hold the budget amount.',
      },
      amount: {
        type: 'number',
        description:
          'Amount to hold for the next month in cents (e.g., 50000 = $500.00). This amount will be carried over to the following month.',
      },
    },
    required: ['month', 'amount'],
  },
};

export async function handler(
  args: HoldBudgetForNextMonthArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = HoldBudgetForNextMonthArgsSchema.parse(args);

    await holdBudgetForNextMonth(parsedArgs.month, parsedArgs.amount);

    return successWithJson(
      `Successfully held budget amount of ${parsedArgs.amount} for next month in ${parsedArgs.month}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
