// ----------------------------
// GET BUDGET MONTH TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { getBudgetMonth } from '../../../actual-api.js';

export const schema = {
  name: 'get-budget-month',
  description:
    'Retrieve detailed budget data for a specific month including category budgets, actual spending, and balances.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- month: Month in YYYY-MM format\n\n' +
    'RETURNED DATA:\n' +
    '- Category budgets (budgeted amounts)\n' +
    '- Actual spending per category\n' +
    '- Category balances (budget - spending)\n' +
    '- Income and expense totals\n\n' +
    'EXAMPLE:\n' +
    '{"month": "2024-01"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Reviewing budget vs actual for a specific month\n' +
    '- Analyzing category-level budget performance\n' +
    '- Checking budget balances before month end\n\n' +
    'NOTES:\n' +
    '- Month format must be YYYY-MM (e.g., "2024-01")\n' +
    '- Returns detailed breakdown by category\n' +
    '- Amounts are in cents\n' +
    '- Use get-budget-months to see which months have data\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-budget-months to see available months\n' +
    '2. Use get-budget-month to get detailed data for specific month\n' +
    '3. Use set-budget to adjust budgets based on performance\n\n' +
    'SEE ALSO:\n' +
    '- get-budget-months: List all months with budget data\n' +
    '- set-budget: Set or update budget amounts\n' +
    '- monthly-summary: High-level financial summary\n' +
    '- spending-by-category: Detailed spending breakdown',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description:
          'Month in YYYY-MM format (e.g., "2024-01" for January 2024). Returns budget data including category budgets, spending, and balances for the specified month.',
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
