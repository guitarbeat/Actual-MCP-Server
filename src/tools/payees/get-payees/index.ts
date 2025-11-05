// ----------------------------
// GET PAYEES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { fetchAllPayees } from '../../../core/data/fetch-payees.js';
import type { Payee } from '../../../types.js';

export const schema = {
  name: 'get-payees',
  description:
    'Retrieve a list of all payees with their id, name, categoryId and transferAccountId.\n\n' +
    'RETURNED DATA:\n' +
    '- Payee ID (UUID) - Use this when creating transactions or rules\n' +
    '- Payee name (e.g., "Whole Foods", "Shell Gas Station")\n' +
    '- Transfer account ID (for transfer payees only)\n\n' +
    'EXAMPLE:\n' +
    '- Get all payees: {} or no arguments\n\n' +
    'COMMON USE CASES:\n' +
    '- Finding payee IDs/names before creating transactions with manage-transaction\n' +
    '- Finding payee IDs for creating auto-categorization rules with manage-entity\n' +
    '- Filtering transactions by payee name with get-transactions\n' +
    '- Identifying transfer payees (account-to-account transfers)\n\n' +
    'SEE ALSO:\n' +
    '- manage-transaction: Create transactions using payee IDs/names from this tool\n' +
    '- manage-entity: Create new payees or rules using payee IDs from this tool\n' +
    '- get-transactions: Filter transactions by payee names found here\n' +
    '- merge-payees: Merge duplicate payees found in this list',
  inputSchema: {
    type: 'object',
    description:
      'This tool does not accept any arguments. Returns all payees including their IDs, names, and associated transfer accounts. Use this to find payee IDs before creating transactions or rules.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const categories: Payee[] = await fetchAllPayees();

    const structured = categories.map((payee) => ({
      id: payee.id,
      name: payee.name,
      transfer_acct: payee.transfer_acct || '(not a transfer payee)',
    }));

    return successWithJson(structured);
  } catch (err) {
    return errorFromCatch(err);
  }
}
