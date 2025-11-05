// ----------------------------
// GET PAYEES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { fetchAllPayees } from '../../../core/data/fetch-payees.js';
import type { Payee } from '../../../types.js';

export const schema = {
  name: 'get-payees',
  description: 'Retrieve a list of all payees with their id, name, categoryId and transferAccountId.',
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
