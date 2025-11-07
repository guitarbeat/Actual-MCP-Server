// ----------------------------
// SWITCH BUDGET TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { downloadBudget, loadBudget } from '../../../actual-api.js';

export const schema = {
  name: 'switch-budget',
  description:
    'Switch to a different budget file. Downloads and loads the specified budget.\n\n' +
    'REQUIRED:\n' +
    '- budgetId: Budget sync ID (cloudFileId) or local ID\n\n' +
    'OPTIONAL:\n' +
    '- password: Password for encrypted budgets\n\n' +
    'EXAMPLE:\n' +
    '- Switch budget: {"budgetId": "abc123-def456"}\n' +
    '- Encrypted budget: {"budgetId": "abc123", "password": "secret123"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Switch between multiple budget files\n' +
    '- Load a different budget for analysis\n' +
    '- Access shared or remote budgets\n' +
    '- Switch to encrypted budget files\n' +
    '- Change active budget context\n\n' +
    'SEE ALSO:\n' +
    '- Use get-budgets to list available budget files and find budget IDs\n' +
    '- Use get-budget to view budget data after switching\n\n' +
    'NOTES:\n' +
    '- Use get-budgets to find available budget IDs\n' +
    '- This will replace the currently loaded budget\n' +
    '- All subsequent operations will use the new budget',
  inputSchema: {
    type: 'object',
    properties: {
      budgetId: {
        type: 'string',
        description: 'Budget sync ID (cloudFileId) or local ID. Use get-budgets to find available IDs.',
      },
      password: {
        type: 'string',
        description: 'Password for encrypted budgets (optional).',
      },
    },
    required: ['budgetId'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { budgetId, password } = args;

    if (!budgetId || typeof budgetId !== 'string') {
      return errorFromCatch('budgetId is required and must be a string');
    }

    const passwordStr = password && typeof password === 'string' ? password : undefined;

    // Try downloadBudget first (handles both local and remote)
    await downloadBudget(budgetId, passwordStr);

    // Also try loadBudget as fallback for local budgets
    try {
      await loadBudget(budgetId);
    } catch {
      // Ignore if loadBudget fails, downloadBudget may have succeeded
    }

    return successWithJson(`Successfully switched to budget: ${budgetId}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
