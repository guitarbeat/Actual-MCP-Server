// ----------------------------
// SET BUDGET TOOL
// Consolidated tool for setting budget amount and carryover
// ----------------------------

import { successWithJson, errorFromCatch } from '../../core/response/index.js';
import { setBudgetAmount, setBudgetCarryover } from '../../actual-api.js';
import { nameResolver } from '../../core/utils/name-resolver.js';
import { SetBudgetArgsSchema, type SetBudgetArgs } from './types.js';

export const schema = {
  name: 'set-budget',
  description:
    'Set budget amount and/or carryover for a category in a specific month. Accepts category name or ID.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- month: Month in YYYY-MM format (e.g., "2024-01" for January 2024)\n' +
    '- category: Category name or ID (use get-grouped-categories to find IDs)\n' +
    '- At least one of amount or carryover must be provided\n\n' +
    'OPTIONAL PARAMETERS:\n' +
    '- amount: Budget amount in cents (e.g., 50000 = $500.00)\n' +
    '- carryover: Enable (true) or disable (false) budget carryover to next month\n\n' +
    'EXAMPLES:\n' +
    '- Set amount only: {"month": "2024-01", "category": "Groceries", "amount": 50000}\n' +
    '- Set carryover only: {"month": "2024-01", "category": "Groceries", "carryover": true}\n' +
    '- Set both: {"month": "2024-01", "category": "Groceries", "amount": 50000, "carryover": true}\n' +
    '- Using category ID: {"month": "2024-01", "category": "abc123-def456", "amount": 30000}\n\n' +
    'COMMON USE CASES:\n' +
    '- Setting monthly budget: Specify amount for a category in a specific month\n' +
    '- Enabling rollover: Set carryover=true to roll unused budget to next month\n' +
    '- Adjusting budget mid-month: Update amount for current month\n' +
    '- Disabling rollover: Set carryover=false to prevent budget from carrying over\n\n' +
    'NOTES:\n' +
    '- Amounts are in cents (multiply dollars by 100)\n' +
    '- Month format must be YYYY-MM (e.g., "2024-01", not "01/2024" or "January 2024")\n' +
    '- Category names are case-sensitive but flexible (partial matches work)\n' +
    '- You can set amount, carryover, or both in a single call\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-grouped-categories to find category names or IDs\n' +
    '2. Use set-budget to set budget amounts for categories\n' +
    '3. Use spending-by-category to track actual spending vs budget\n' +
    '4. Use monthly-summary to see overall budget performance\n\n' +
    'SEE ALSO:\n' +
    '- get-grouped-categories: Find category IDs and names before setting budgets\n' +
    '- spending-by-category: Compare actual spending to budgeted amounts\n' +
    '- monthly-summary: View overall financial performance including budgeted categories\n' +
    '- hold-budget-for-next-month: Hold entire budget for next month\n' +
    '- reset-budget-hold: Reset budget hold for a category',
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
          'Budget amount in cents (e.g., 50000 = $500.00, 12500 = $125.00). Must be a positive integer. Optional if carryover is provided.',
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

    // Resolve category name to ID if needed
    const categoryId = await nameResolver.resolveCategory(parsedArgs.category);

    const operations: string[] = [];

    // Set amount if provided
    if (parsedArgs.amount !== undefined) {
      await setBudgetAmount(parsedArgs.month, categoryId, parsedArgs.amount);
      operations.push(`amount set to ${parsedArgs.amount}`);
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
    return errorFromCatch(err);
  }
}
