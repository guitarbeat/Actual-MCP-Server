// ----------------------------
// GET BUDGETS TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { getBudgets } from '../../../actual-api.js';

export const schema = {
  name: 'get-budgets',
  description: 'Get a list of all available budgets',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handler(
  _args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const budgets = await getBudgets();

    return successWithJson(budgets);
  } catch (err) {
    return errorFromCatch(err);
  }
}
