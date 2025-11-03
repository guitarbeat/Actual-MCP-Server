// ----------------------------
// DOWNLOAD BUDGET TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { downloadBudget } from '../../../actual-api.js';

export const schema = {
  name: 'download-budget',
  description: 'Download a budget from the server. Supports end-to-end encrypted budgets with password.',
  inputSchema: {
    type: 'object',
    properties: {
      budgetId: {
        type: 'string',
        description: 'ID of the budget to download',
      },
      password: {
        type: 'string',
        description: 'Optional password for end-to-end encrypted budgets',
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

    const budgetId = args.budgetId as string;
    const password = args.password && typeof args.password === 'string' ? args.password : undefined;

    await downloadBudget(budgetId, password);

    return successWithJson(`Successfully downloaded budget ${budgetId}${password ? ' (with E2E encryption)' : ''}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
