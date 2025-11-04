// ----------------------------
// GET BUDGET MONTH TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getBudgetMonth } from '../../../actual-api.js';

export const schema = {
  name: 'get-budget-month',
  description: 'Get budget data for a specific month',
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
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.month || typeof args.month !== 'string') {
      return errorFromCatch('month is required and must be a string in YYYY-MM format');
    }

    const budget = await getBudgetMonth(args.month as string);

    return successWithJson(budget);
  } catch (err) {
    return errorFromCatch(err);
  }
}
