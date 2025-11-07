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
    'Set budget amount and/or carryover for a category in a specific month.\n\n' +
    'REQUIRED:\n' +
    '- month: Month in YYYY-MM format (e.g., "2024-01")\n' +
    '- category: Category name or ID (supports partial name matching, case-sensitive)\n' +
    '- At least one of: amount or carryover\n\n' +
    'EXAMPLES:\n' +
    '- Set amount: {"month": "2024-01", "category": "Groceries", "amount": 50000}\n' +
    '- Set carryover: {"month": "2024-01", "category": "Groceries", "carryover": true}\n' +
    '- Set both: {"month": "2024-01", "category": "Groceries", "amount": 50000, "carryover": true}\n' +
    '- Disable carryover: {"month": "2024-01", "category": "Groceries", "carryover": false}\n' +
    '- Multiple months: Set budget for each month separately\n\n' +
    'COMMON USE CASES:\n' +
    '- Set monthly budget amounts for categories\n' +
    '- Enable or disable budget carryover (rollover unused amounts)\n' +
    '- Adjust budgets month-over-month\n' +
    '- Set up initial budgets for new categories\n' +
    '- Modify budgets based on spending patterns\n' +
    '- Copy budgets from previous months\n\n' +
    'SEE ALSO:\n' +
    '- Use get-grouped-categories to find category names/IDs\n' +
    '- Use get-budget to view current budget amounts and spending\n' +
    '- Use spending-by-category to see actual spending vs budgets\n' +
    '- Use hold-budget to hold budget for next month\n' +
    '- Use reset-budget-hold to clear budget holds\n\n' +
    'NOTES:\n' +
    '- Amount in cents (e.g., 50000 = $500.00, 12500 = $125.00)\n' +
    '- Month format: YYYY-MM (e.g., "2024-01" for January 2024)\n' +
    '- Category names are case-sensitive for partial matching\n' +
    '- Carryover enables unused budget to roll over to next month',
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
