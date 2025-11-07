// ----------------------------
// MANAGE BUDGET HOLD TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { holdBudgetForNextMonth, resetBudgetHold } from '../../../actual-api.js';

export const schema = {
  name: 'manage-budget-hold',
  description:
    'Hold or reset budget amounts for the next month. Use to save for large purchases or irregular expenses.\n\n' +
    'OPERATIONS:\n\n' +
    '• HOLD: Set aside a budget amount for next month\n' +
    '  Required: operation="hold", month, amount\n' +
    '  Example: {"operation": "hold", "month": "2024-01", "amount": 50000}\n\n' +
    '• RESET: Clear a budget hold\n' +
    '  Required: operation="reset", month\n' +
    '  Example: {"operation": "reset", "month": "2024-01"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Save unused budget for next month\n' +
    '- Plan for large irregular expenses\n' +
    '- Build up budget over multiple months\n' +
    '- Clear budget holds when no longer needed\n' +
    '- Manage budget flexibility month-to-month\n\n' +
    'SEE ALSO:\n' +
    '- Use get-budget to view current budget amounts\n' +
    '- Use set-budget to set budget amounts\n' +
    '- Use spending-by-category to see actual spending\n\n' +
    'NOTES:\n' +
    '- Month format: YYYY-MM\n' +
    '- Amount in cents (e.g., 50000 = $500.00)\n' +
    '- Hold amount becomes available in the following month',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['hold', 'reset'],
        description: 'Operation: "hold" to set aside budget, "reset" to clear hold',
      },
      month: {
        type: 'string',
        description: 'Month in YYYY-MM format (e.g., "2024-01")',
      },
      amount: {
        type: 'number',
        description: 'Amount to hold in cents (required for "hold" operation). Example: 50000 = $500.00',
      },
    },
    required: ['operation', 'month'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { operation, month, amount } = args;

    if (!operation || (operation !== 'hold' && operation !== 'reset')) {
      return errorFromCatch('operation must be "hold" or "reset"');
    }

    if (!month || typeof month !== 'string') {
      return errorFromCatch('month is required and must be a string in YYYY-MM format');
    }

    if (operation === 'hold') {
      if (amount === undefined || typeof amount !== 'number') {
        return errorFromCatch('amount is required for "hold" operation');
      }
      await holdBudgetForNextMonth(month, amount);
      return successWithJson(`Successfully held budget amount of ${amount} for next month in ${month}`);
    } else {
      // reset operation
      await resetBudgetHold(month);
      return successWithJson(`Successfully reset budget hold for month ${month}`);
    }
  } catch (err) {
    return errorFromCatch(err);
  }
}
