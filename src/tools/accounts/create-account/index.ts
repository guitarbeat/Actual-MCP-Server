// ----------------------------
// CREATE ACCOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createAccount } from '../../../actual-api.js';

export const schema = {
  name: 'create-account',
  description: 'Create a new account',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the account',
      },
      type: {
        type: 'string',
        description: 'Type of account (e.g., "checking", "savings", "credit")',
      },
      offbudget: {
        type: 'boolean',
        description: 'Whether the account is off-budget',
      },
      balance: {
        type: 'number',
        description: 'Initial balance of the account',
      },
      closed: {
        type: 'boolean',
        description: 'Whether the account is closed',
      },
    },
    required: ['name'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.name || typeof args.name !== 'string') {
      return errorFromCatch('name is required and must be a string');
    }

    const data: Record<string, unknown> = { name: args.name };
    if (args.type) {
      data.type = args.type;
    }
    if (args.offbudget !== undefined) {
      data.offbudget = args.offbudget;
    }
    if (args.balance !== undefined) {
      data.balance = args.balance;
    }
    if (args.closed !== undefined) {
      data.closed = args.closed;
    }

    const id: string = await createAccount(data);

    return successWithJson('Successfully created account ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}

