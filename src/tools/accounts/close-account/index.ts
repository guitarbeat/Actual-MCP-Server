// ----------------------------
// CLOSE ACCOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { closeAccount } from '../../../actual-api.js';

export const schema = {
  name: 'close-account',
  description: 'Close an account',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'ID of the account to close',
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

    await closeAccount(args.accountId as string);

    return successWithJson('Successfully closed account ' + args.accountId);
  } catch (err) {
    return errorFromCatch(err);
  }
}


