// ----------------------------
// DELETE ACCOUNT TOOL
// ----------------------------

import { successWithJson, error, errorFromCatch } from '../../../core/response/index.js';
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
      return error(
        'accountId is required and must be a string',
        'Use the get-accounts tool to list available accounts and retry with a valid accountId.'
      );
    }

    await deleteAccount(args.accountId as string);

    return successWithJson('Successfully deleted account ' + args.accountId);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: `Failed to delete account ${String(args.accountId ?? '')}`.trim(),
      suggestion:
        'Ensure the account is not already removed and that you have deletion permissions in Actual before retrying.',
    });
  }
}
