// ----------------------------
// GET BUDGET MONTHS TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { getBudgetMonths } from '../../../actual-api.js';

export const schema = {
  name: 'get-budget-months',
  description: 'Get a list of all months that have budget data',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handler(
  _args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const months = await getBudgetMonths();

    return successWithJson(months);
  } catch (err) {
    return errorFromCatch(err);
  }
}
