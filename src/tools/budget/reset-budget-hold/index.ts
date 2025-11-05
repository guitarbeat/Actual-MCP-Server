// ----------------------------
// RESET BUDGET HOLD TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { resetBudgetHold } from '../../../actual-api.js';
import { ResetBudgetHoldArgsSchema, type ResetBudgetHoldArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'reset-budget-hold',
  description:
    'Clear a budget hold that was previously set for a specific month. Removes the hold amount and returns budget to normal state.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- month: Month to clear hold from (YYYY-MM format)\n\n' +
    'EXAMPLE:\n' +
    '{"month": "2024-01"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Clearing holds after planned expense is complete\n' +
    '- Removing holds that are no longer needed\n' +
    '- Resetting budget to normal state\n\n' +
    'NOTES:\n' +
    '- Month format must be YYYY-MM (e.g., "2024-01")\n' +
    '- Only affects budget holds set by hold-budget-for-next-month\n' +
    '- Does not affect regular budget amounts or carryover settings\n' +
    '- Safe to call even if no hold exists for the month\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use hold-budget-for-next-month to set a hold\n' +
    '2. When hold is no longer needed, use reset-budget-hold\n' +
    '3. Use monthly-summary to verify hold was cleared\n\n' +
    'SEE ALSO:\n' +
    '- hold-budget-for-next-month: Set budget hold for a month\n' +
    '- set-budget: Set regular budget amounts and carryover\n' +
    '- monthly-summary: View budget performance',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description:
          'Month in YYYY-MM format (e.g., "2024-01" for January 2024). This will clear any budget hold that was set for this month.',
      },
    },
    required: ['month'],
  },
};

export async function handler(
  args: ResetBudgetHoldArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = ResetBudgetHoldArgsSchema.parse(args);

    await resetBudgetHold(parsedArgs.month);

    return successWithJson('Successfully reset budget hold for month ' + parsedArgs.month);
  } catch (err) {
    return errorFromCatch(err);
  }
}
