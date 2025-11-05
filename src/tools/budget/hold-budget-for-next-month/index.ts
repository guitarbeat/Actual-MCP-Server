// ----------------------------
// HOLD BUDGET FOR NEXT MONTH TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { holdBudgetForNextMonth } from '../../../actual-api.js';
import { HoldBudgetForNextMonthArgsSchema, type HoldBudgetForNextMonthArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'hold-budget-for-next-month',
  description:
    'Hold a specific budget amount to carry over to the next month. Useful for saving up for large purchases or irregular expenses.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- month: Month to hold budget from (YYYY-MM format)\n' +
    '- amount: Amount to hold in cents\n\n' +
    'EXAMPLE:\n' +
    '{"month": "2024-01", "amount": 50000}\n\n' +
    'COMMON USE CASES:\n' +
    '- Saving for large irregular expenses (annual insurance, property taxes)\n' +
    '- Building up funds for planned purchases\n' +
    '- Carrying over unused budget to next month\n\n' +
    'NOTES:\n' +
    '- Amount is in cents (e.g., 50000 = $500.00)\n' +
    '- Month format must be YYYY-MM (e.g., "2024-01")\n' +
    '- Held amount will be available in the following month\n' +
    '- Use reset-budget-hold to clear a hold\n' +
    '- Different from carryover - this is a specific amount to hold\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Identify amount needed for future expense\n' +
    '2. Use hold-budget-for-next-month to set aside funds\n' +
    '3. Use monthly-summary to verify budget hold\n' +
    '4. Use reset-budget-hold when hold is no longer needed\n\n' +
    'SEE ALSO:\n' +
    '- reset-budget-hold: Clear budget hold for a month\n' +
    '- set-budget: Set regular budget amounts and carryover\n' +
    '- monthly-summary: View budget performance including holds',
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
