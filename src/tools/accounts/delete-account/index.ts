// ----------------------------
// DELETE ACCOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { deleteAccount } from '../../../actual-api.js';

export const schema = {
  name: 'delete-account',
  description: 'Delete an account',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'ID of the account to delete',
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

    await deleteAccount(args.accountId as string);

    return successWithJson('Successfully deleted account ' + args.accountId);
  } catch (err) {
    return errorFromCatch(err);
  }
}

