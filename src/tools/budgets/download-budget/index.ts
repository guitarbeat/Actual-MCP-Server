// ----------------------------
// DOWNLOAD BUDGET TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { downloadBudget } from '../../../actual-api.js';

export const schema = {
  name: 'download-budget',
  description: 'Download a budget from the server',
  inputSchema: {
    type: 'object',
    properties: {
      budgetId: {
        type: 'string',
        description: 'ID of the budget to download',
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

    await downloadBudget(args.budgetId as string);

    return successWithJson('Successfully downloaded budget ' + args.budgetId);
  } catch (err) {
    return errorFromCatch(err);
  }
}
