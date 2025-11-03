// ----------------------------
// GET ACCOUNT BALANCE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getAccountBalance } from '../../../actual-api.js';
import { formatAmount } from '../../../utils.js';

export const schema = {
  name: 'get-account-balance',
  description: 'Get the balance of an account as of a specific date',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'ID of the account',
      },
      date: {
        type: 'string',
        description: 'Date to get balance for (YYYY-MM-DD format). If not provided, returns current balance.',
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

    const date = args.date && typeof args.date === 'string' ? args.date : undefined;
    const balance: number = await getAccountBalance(args.accountId as string, date);

    return successWithJson({
      accountId: args.accountId,
      date: date || 'current',
      balance: balance,
      formattedBalance: formatAmount(balance),
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
