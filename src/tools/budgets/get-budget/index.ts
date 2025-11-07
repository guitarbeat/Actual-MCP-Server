// ----------------------------
// GET BUDGET TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { getBudgetMonths, getBudgetMonth } from '../../../actual-api.js';

export const schema = {
  name: 'get-budget',
  description:
    'Retrieve budget data for Actual Budget. If month is provided, returns detailed budget for that month. If omitted, returns list of available months.\n\n' +
    'PARAMETERS:\n' +
    '- month: (Optional) Month in YYYY-MM format. If provided, returns detailed budget data for that month.\n\n' +
    'EXAMPLES:\n' +
    '- List available months: {}\n' +
    '- Get budget for specific month: {"month": "2024-01"}\n\n' +
    'COMMON USE CASES:\n' +
    '- View budget amounts and spending for a specific month\n' +
    '- Check budget vs actual spending by category\n' +
    '- List all months with budget data\n' +
    '- Review budget balances and remaining amounts\n' +
    '- Analyze budget performance\n\n' +
    'SEE ALSO:\n' +
    '- Use with set-budget to set budget amounts for categories\n' +
    '- Use with hold-budget to hold budget for next month\n' +
    '- Use with reset-budget-hold to clear budget holds\n' +
    '- Use with spending-by-category to compare actual spending to budgets\n\n' +
    'RETURNS:\n' +
    '- If month omitted: Array of month strings in YYYY-MM format\n' +
    '- If month provided: Detailed budget data including category budgets, spending, and balances',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description:
          'Month in YYYY-MM format (e.g., "2024-01"). If provided, returns detailed budget data for that month. If omitted, returns list of available months.',
      },
    },
    required: [],
  },
};

/**
 * Validate month format (YYYY-MM) and ensure it's a valid month
 *
 * @param month - Month string to validate
 * @throws Error if format is invalid
 */
function validateMonthFormat(month: string): void {
  // Check format matches YYYY-MM pattern
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Invalid month format. Expected YYYY-MM format (e.g., 2024-01)');
  }

  // Extract year and month
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  // Validate year is reasonable (1900-2100)
  if (year < 1900 || year > 2100) {
    throw new Error('Invalid year. Year must be between 1900 and 2100');
  }

  // Validate month is between 1-12
  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Invalid month. Month must be between 01 and 12');
  }
}

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (args.month) {
      if (typeof args.month !== 'string') {
        return errorFromCatch('month must be a string in YYYY-MM format');
      }
      // Validate month format before calling API
      validateMonthFormat(args.month);

      try {
        const budget = await getBudgetMonth(args.month);
        return successWithJson(budget);
      } catch (apiError) {
        // Handle API errors specifically
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        // Check if it's a "not found" or similar error
        if (errorMessage.includes('not found') || errorMessage.includes('Not found')) {
          return errorFromCatch(`Budget data not found for month ${args.month}`, {
            fallbackMessage: 'Failed to retrieve budget data',
            suggestion: 'Use the get-budget tool without a month parameter to list available months.',
          });
        }
        // Re-throw to be caught by outer catch
        throw apiError;
      }
    } else {
      const months = await getBudgetMonths();
      return successWithJson(months);
    }
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to retrieve budget data',
      suggestion:
        'Use the get-budget tool to list available months, then provide the month in YYYY-MM format (e.g., 2024-08).',
    });
  }
}
