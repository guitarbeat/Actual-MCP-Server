// ----------------------------
// GET BUDGETS TOOL
// ----------------------------

import { getBudgets } from '../../../actual-api.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';

export const schema = {
  name: 'get-budget-files',
  description:
    'List all available budget files (local and remote). Use to see available budget files before switching.\n\n' +
    'EXAMPLE:\n' +
    '- Get all: {}\n\n' +
    'COMMON USE CASES:\n' +
    '- List all available budget files before switching\n' +
    '- Find budget IDs for switching budgets\n' +
    '- Check encryption status of budget files\n' +
    '- View budget metadata (name, cloudFileId, groupId)\n' +
    '- Identify local vs remote budgets\n\n' +
    'SEE ALSO:\n' +
    '- Use with switch-budget to change the active budget\n' +
    '- Use with get-budget-month to view budget data after switching\n\n' +
    'RETURNS:\n' +
    '- Array of budget files with name, cloudFileId, groupId, encryption status\n' +
    '- Local budgets have an id field\n' +
    '- Remote budgets have a state field set to "remote"',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments. Returns all available budget files.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const budgets = await getBudgets();
    return successWithJson(budgets);
  } catch (err) {
    return errorFromCatch(err);
  }
}
