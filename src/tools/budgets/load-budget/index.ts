// ----------------------------
// LOAD BUDGET TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { loadBudget } from '../../../actual-api.js';

export const schema = {
  name: 'load-budget',
  description: 'Load a budget by its ID',
  inputSchema: {
    type: 'object',
    properties: {
      budgetId: {
        type: 'string',
        description: 'ID of the budget to load',
      },
    },
    required: ['budgetId'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.budgetId || typeof args.budgetId !== 'string') {
      return errorFromCatch('budgetId is required and must be a string');
    }

    await loadBudget(args.budgetId as string);

    return successWithJson('Successfully loaded budget ' + args.budgetId);
  } catch (err) {
    return errorFromCatch(err);
  }
}
