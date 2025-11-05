// ----------------------------
// REOPEN ACCOUNT TOOL
// ----------------------------

import { successWithJson, error, errorFromCatch } from '../../../core/response/index.js';
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
      return error(
        'accountId is required and must be a string',
        'Use the get-accounts tool to list available accounts and retry with a valid accountId.'
      );
    }

    await reopenAccount(args.accountId as string);

    return successWithJson('Successfully reopened account ' + args.accountId);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: `Failed to reopen account ${String(args.accountId ?? '')}`.trim(),
      suggestion: 'Confirm the account is currently closed and that you have permission to modify it before retrying.',
    });
  }
}
