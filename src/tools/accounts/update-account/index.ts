// ----------------------------
// UPDATE ACCOUNT TOOL
// ----------------------------

import { successWithJson, error, errorFromCatch } from '../../../utils/response.js';
import { updateAccount } from '../../../actual-api.js';

export const schema = {
  name: 'update-account',
  description: 'Update an existing account',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'ID of the account to update',
      },
      name: {
        type: 'string',
        description: 'New name for the account',
      },
      type: {
        type: 'string',
        description: 'New type of account (e.g., "checking", "savings", "credit")',
      },
      offbudget: {
        type: 'boolean',
        description: 'Whether the account is off-budget',
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
        'Use the get-accounts tool to list available accounts and retry with a valid accountId.',
      );
    }

    const data: Record<string, unknown> = {};
    if (args.name) {
      data.name = args.name;
    }
    if (args.type) {
      data.type = args.type;
    }
    if (args.offbudget !== undefined) {
      data.offbudget = args.offbudget;
    }

    await updateAccount(args.accountId as string, data);

    return successWithJson('Successfully updated account ' + args.accountId);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: `Failed to update account ${String(args.accountId ?? '')}`.trim(),
      suggestion:
        'Confirm the account still exists and that any updated fields meet Actual Budget constraints before retrying.',
    });
  }
}
