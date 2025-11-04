// ----------------------------
// HOLD BUDGET FOR NEXT MONTH TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { holdBudgetForNextMonth } from '../../../actual-api.js';

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
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.month || typeof args.month !== 'string') {
      return errorFromCatch('month is required and must be a string in YYYY-MM format');
    }
    if (args.amount === undefined || typeof args.amount !== 'number') {
      return errorFromCatch('amount is required and must be a number');
    }

    await holdBudgetForNextMonth(args.month as string, args.amount as number);

    return successWithJson(`Successfully held budget amount of ${args.amount} for next month in ${args.month}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
