// ----------------------------
// SET BUDGET CARRYOVER TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { setBudgetCarryover } from '../../../actual-api.js';
import { SetBudgetCarryoverArgsSchema, type SetBudgetCarryoverArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'set-budget-carryover',
  description: 'Enable or disable budget carryover for a category in a specific month',
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
      enabled: {
        type: 'boolean',
        description: 'Whether to enable carryover',
      },
    },
    required: ['month', 'categoryId', 'enabled'],
  },
};

export async function handler(
  args: SetBudgetCarryoverArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = SetBudgetCarryoverArgsSchema.parse(args);

    await setBudgetCarryover(parsedArgs.month, parsedArgs.categoryId, parsedArgs.enabled);

    return successWithJson(
      `Successfully ${parsedArgs.enabled ? 'enabled' : 'disabled'} budget carryover for category ${parsedArgs.categoryId} in month ${parsedArgs.month}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
