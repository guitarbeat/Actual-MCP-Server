// ----------------------------
// SET BUDGET CARRYOVER TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetCarryover } from '../../../actual-api.js';

export const schema = {
  name: 'set-budget-carryover',
  description: 'Enable or disable budget carryover for a category',
  inputSchema: {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        description: 'ID of the category',
      },
      enabled: {
        type: 'boolean',
        description: 'Whether to enable carryover',
      },
    },
    required: ['categoryId', 'enabled'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.categoryId || typeof args.categoryId !== 'string') {
      return errorFromCatch('categoryId is required and must be a string');
    }
    if (args.enabled === undefined || typeof args.enabled !== 'boolean') {
      return errorFromCatch('enabled is required and must be a boolean');
    }

    await setBudgetCarryover(args.categoryId as string, args.enabled as boolean);

    return successWithJson(
      `Successfully ${args.enabled ? 'enabled' : 'disabled'} budget carryover for category ${args.categoryId}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
