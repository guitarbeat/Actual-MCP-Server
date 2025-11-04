// ----------------------------
// RESET BUDGET HOLD TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { resetBudgetHold } from '../../../actual-api.js';
import { resetBudgetHoldArgsSchema, type ResetBudgetHoldArgs } from './types.js';

export const schema = {
  name: 'reset-budget-hold',
  description: 'Reset the budget hold for a specific month',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Month in YYYY-MM format',
      },
    },
    required: ['month'],
  },
};

export async function handler(
  args: ResetBudgetHoldArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = resetBudgetHoldArgsSchema.parse(args);

    await resetBudgetHold(parsedArgs.month);

    return successWithJson('Successfully reset budget hold for month ' + parsedArgs.month);
  } catch (err) {
    return errorFromCatch(err);
  }
}
