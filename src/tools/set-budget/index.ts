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
    'Set budget amount and/or carryover for a category in a specific month. Accepts category name or ID. At least one of amount or carryover must be provided.',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Month in YYYY-MM format',
      },
      category: {
        type: 'string',
        description: 'Category name or ID',
      },
      amount: {
        type: 'number',
        description: 'Budget amount to set (in cents). Optional if carryover is provided.',
      },
      carryover: {
        type: 'boolean',
        description: 'Enable or disable budget carryover. Optional if amount is provided.',
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
