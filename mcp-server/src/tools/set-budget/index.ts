// ----------------------------
// SET BUDGET TOOL
// Consolidated tool for setting budget amount and carryover
// ----------------------------

import { setBudgetAmount, setBudgetCarryover } from '../../core/api/actual-client.js';
import { errorFromCatch, successWithJson } from '../../core/response/index.js';
import { nameResolver } from '../../core/utils/name-resolver.js';
import { formatAmount } from '../../core/formatting/index.js';
import { type SetBudgetArgs, SetBudgetArgsSchema } from './types.js';

export const schema = {
  name: 'set-budget',
  description:
    'Set or update the budget amount for a category in a specific month. Use this when the user wants to create or change a budget.\n\n' +
    'WHEN TO USE:\n' +
    '- User says "set my groceries budget to $500"\n' +
    '- User wants to "update budget" or "change budget"\n' +
    '- User asks to "budget $X for [category]"\n' +
    '- User wants to "enable carryover" or "rollover unused budget"\n' +
    '- User is setting up budgets for a new month\n\n' +
    'REQUIRED:\n' +
    '- month: YYYY-MM format (e.g., "2024-01" for January)\n' +
    '- category: Category name (e.g., "Groceries")\n' +
    '- amount: Dollar amount (e.g., 500 for $500) OR carryover: true/false\n\n' +
    'EXAMPLES:\n' +
    '- "Set groceries to $500": {"month": "2024-01", "category": "Groceries", "amount": 500}\n' +
    '- "Move $100 from groceries": {"month": "2024-01", "category": "Groceries", "amount": -100}\n' +
    '- "Enable carryover": {"month": "2024-01", "category": "Groceries", "carryover": true}\n' +
    '- "Set budget with carryover": {"month": "2024-01", "category": "Groceries", "amount": 500, "carryover": true}\n\n' +
    'NOTES:\n' +
    '- Amounts < 1000 treated as dollars (500 = $500, -100 = -$100)\n' +
    '- Amounts >= 1000 treated as cents (50000 = $500, -10000 = -$100)\n' +
    '- Negative amounts move money FROM the category (useful for budget adjustments)\n' +
    '- Use get-grouped-categories first if you need to find the exact category name',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description:
          'Month in YYYY-MM format (e.g., "2024-01" for January 2024, "2024-12" for December 2024). Must be a valid month.',
      },
      category: {
        type: 'string',
        description:
          'Category name or ID. Accepts partial name matches (case-sensitive). Use get-grouped-categories tool to find exact category names or IDs.',
      },
      amount: {
        type: 'number',
        description:
          'Budget amount (dollars or cents, auto-detected). Amounts < 1000 are treated as dollars (e.g., 500 = $500.00, -100 = -$100.00), amounts >= 1000 are treated as cents (e.g., 50000 = $500.00, -10000 = -$100.00). Supports negative amounts for moving money from categories. Optional if carryover is provided.',
      },
      carryover: {
        type: 'boolean',
        description:
          'Enable (true) or disable (false) budget carryover. When enabled, unused budget rolls over to the next month. Optional if amount is provided.',
      },
    },
    required: ['month', 'category'],
  },
};

/**
 * Handler for the set-budget tool.
 * Consolidates budget amount and carryover operations into a single tool.
 *
 * @param args - Set budget arguments
 * @returns Success or error response
 */
export async function handler(
  args: SetBudgetArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    // Validate arguments
    const parsedArgs = SetBudgetArgsSchema.parse(args);

    // Resolve category name to ID if needed (provides helpful error with available categories)
    const categoryId = await nameResolver.resolveCategory(parsedArgs.category);

    const operations: string[] = [];

    // Set amount if provided (already converted to cents by schema transform)
    if (parsedArgs.amount !== undefined) {
      await setBudgetAmount(parsedArgs.month, categoryId, parsedArgs.amount);
      // Format amount for display using formatAmount utility
      operations.push(`amount set to ${formatAmount(parsedArgs.amount)}`);
    }

    // Set carryover if provided
    if (parsedArgs.carryover !== undefined) {
      await setBudgetCarryover(parsedArgs.month, categoryId, parsedArgs.carryover);
      operations.push(`carryover ${parsedArgs.carryover ? 'enabled' : 'disabled'}`);
    }

    return successWithJson(
      `Successfully updated budget for category '${parsedArgs.category}' in ${parsedArgs.month}: ${operations.join(', ')}`
    );
  } catch (err) {
    // NameResolver already provides helpful error messages with available categories
    // errorFromCatch will preserve those messages
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to set budget',
      suggestion: 'Check that the category name/ID is correct and the month is in YYYY-MM format.',
    });
  }
}
