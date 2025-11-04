// ----------------------------
// RUN BANK SYNC TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { runBankSync } from '../../../actual-api.js';

export const schema = {
  name: 'run-bank-sync',
  description: 'Run bank sync for an account',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'ID of the account to sync. If not provided, syncs all accounts.',
      },
    },
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const accountId = args.accountId && typeof args.accountId === 'string' ? args.accountId : undefined;

    await runBankSync(accountId);

    return successWithJson(
      accountId ? `Successfully ran bank sync for account ${accountId}` : 'Successfully ran bank sync for all accounts'
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
