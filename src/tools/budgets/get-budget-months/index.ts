// ----------------------------
// GET BUDGET MONTHS TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { getBudgetMonths } from '../../../actual-api.js';

export const schema = {
  name: 'get-budget-months',
  description:
    'Retrieve a list of all months that have budget data in the system. Useful for determining the available date range for budget analysis.\n\n' +
    'RETURNED DATA:\n' +
    '- Array of month strings in YYYY-MM format\n' +
    '- Sorted chronologically (oldest to newest)\n\n' +
    'EXAMPLE:\n' +
    '{} or no arguments\n\n' +
    'COMMON USE CASES:\n' +
    '- Finding the date range of available budget data\n' +
    '- Determining which months to analyze\n' +
    '- Checking if budget data exists before querying specific month\n\n' +
    'NOTES:\n' +
    '- No parameters required\n' +
    '- Returns months in YYYY-MM format\n' +
    '- Only includes months with budget data\n' +
    '- Use get-budget-month to retrieve details for specific months\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-budget-months to see available months\n' +
    '2. Use get-budget-month to get detailed data for specific months\n' +
    '3. Use monthly-summary for multi-month analysis\n\n' +
    'SEE ALSO:\n' +
    '- get-budget-month: Get detailed budget data for a specific month\n' +
    '- monthly-summary: Analyze multiple months at once\n' +
    '- set-budget: Set budget amounts for categories',
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
