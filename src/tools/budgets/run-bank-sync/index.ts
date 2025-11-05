// ----------------------------
// RUN BANK SYNC TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { runBankSync } from '../../../actual-api.js';

export const schema = {
  name: 'run-bank-sync',
  description:
    'Trigger bank synchronization to import new transactions from connected bank accounts. Requires bank sync to be configured in Actual Budget.\n\n' +
    'OPTIONAL PARAMETERS:\n' +
    '- accountId: Specific account ID to sync (omit to sync all connected accounts)\n\n' +
    'EXAMPLES:\n' +
    '- Sync all accounts: {} or no arguments\n' +
    '- Sync specific account: {"accountId": "abc123-def456"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Importing latest transactions from bank\n' +
    '- Refreshing account balances\n' +
    '- Updating transactions after bank activity\n\n' +
    'NOTES:\n' +
    '- Requires bank sync to be configured in Actual Budget settings\n' +
    '- Only works for accounts with active bank connections\n' +
    '- May take several seconds to complete depending on transaction volume\n' +
    '- Use get-accounts to find account IDs if syncing specific account\n' +
    '- New transactions will appear after sync completes\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use run-bank-sync to import latest transactions\n' +
    '2. Use get-transactions to view newly imported transactions\n' +
    '3. Use manage-transaction to categorize or update imported transactions\n\n' +
    'SEE ALSO:\n' +
    '- get-accounts: Find account IDs for specific account sync\n' +
    '- get-transactions: View transactions after sync\n' +
    '- manage-transaction: Update imported transactions\n' +
    '- run-import: Import transactions from file instead of bank sync',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description:
          'ID of the account to sync. Must be a valid account UUID. If not provided, syncs all accounts that have bank sync enabled. Use get-accounts to find account IDs.',
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
