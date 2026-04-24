// ----------------------------
// GET BUDGET TOOL
// ----------------------------

import { getBudgetMonth, getBudgetMonths } from '../../../core/api/actual-client.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';

export const schema = {
  name: 'get-budget-month',
  description:
    'View budget details for a specific month showing budgeted amounts vs actual spending. Use this when the user asks about budget for a particular month.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "show me my January budget"\n' +
    '- User wants to see "budget vs actual for [month]"\n' +
    '- User asks "what months have budget data?"\n' +
    '- User wants to "check budget performance"\n' +
    '- User needs to see "remaining budget" for categories\n\n' +
    'OPTIONAL:\n' +
    '- month: YYYY-MM format (e.g., "2024-01"). Omit to list available months.\n\n' +
    'EXAMPLES:\n' +
    '- "Show available months": {}\n' +
    '- "January 2024 budget": {"month": "2024-01"}\n\n' +
    'RETURNS: If month provided: detailed budget data with spending. If omitted: list of available months.',
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
export function validateMonthFormat(month: string): void {
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
  args: Record<string, unknown>,
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
            suggestion:
              'Use the get-budget-month tool without a month parameter to list available months.',
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
        'Use the get-budget-month tool to list available months, then provide the month in YYYY-MM format (e.g., 2024-08).',
    });
  }
}
