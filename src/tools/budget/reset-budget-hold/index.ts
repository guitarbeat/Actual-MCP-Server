// ----------------------------
// RESET BUDGET HOLD TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { resetBudgetHold } from '../../../actual-api.js';
import { ResetBudgetHoldArgsSchema, type ResetBudgetHoldArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'reset-budget-hold',
  description: 'Reset the budget hold for a specific month',
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
