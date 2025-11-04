// ----------------------------
// REOPEN ACCOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { reopenAccount } from '../../../actual-api.js';

export const schema = {
  name: 'reopen-account',
  description: 'Reopen a closed account',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'ID of the account to reopen',
      },
    },
    required: ['accountId'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.accountId || typeof args.accountId !== 'string') {
      return errorFromCatch('accountId is required and must be a string');
    }

    await reopenAccount(args.accountId as string);

    return successWithJson('Successfully reopened account ' + args.accountId);
  } catch (err) {
    return errorFromCatch(err);
  }
}