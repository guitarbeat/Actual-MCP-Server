// ----------------------------
// IMPORT TRANSACTIONS TOOL
// ----------------------------

import {
  successWithJson,
  errorFromCatch,
  validationError,
  unsupportedFeatureError,
} from '../../../core/response/index.js';
import { runBankSync } from '../../../actual-api.js';

const API_UNAVAILABLE_ERROR_FRAGMENT = 'not available in this version of the API';
const METHOD_NOT_FUNCTION_FRAGMENT = 'is not a function';

export const schema = {
  name: 'import-transactions',
  description:
    'Sync transactions from connected bank accounts. Use to update your budget with new transactions from bank connections.\n\n' +
    'OPERATION:\n\n' +
    '• BANK SYNC: Import from connected bank accounts\n' +
    '  Required: source="bank"\n' +
    '  Optional: accountId (sync specific account, omit for all)\n' +
    '  Example: {"source": "bank"}\n' +
    '  Example: {"source": "bank", "accountId": "abc123"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Sync all accounts from connected banks\n' +
    '- Sync specific account from bank connection\n' +
    '- Update budget with latest transactions\n' +
    '- Refresh transaction data after bank activity\n' +
    '- Import transactions automatically\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account IDs for syncing specific accounts\n' +
    '- Use get-transactions to view imported transactions\n' +
    '- Use create-transaction to manually add transactions not from bank\n\n' +
    'NOTES:\n' +
    '- Bank sync requires configured bank connections\n' +
    '- To import transactions from CSV/OFX/QIF files, use the Actual Budget UI (file import is not available via API for existing budgets)',
  inputSchema: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        enum: ['bank'],
        description: 'Import source: "bank" for bank sync',
      },
      accountId: {
        type: 'string',
        description: 'Account ID (optional). If omitted, syncs all accounts.',
      },
    },
    required: ['source'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { source, accountId } = args;

    if (!source || source !== 'bank') {
      return validationError('source must be "bank"', { field: 'source', expected: '"bank"' });
    }

    const accountIdStr = accountId && typeof accountId === 'string' ? accountId : undefined;
    await runBankSync(accountIdStr);
    return successWithJson(
      accountIdStr ? `Successfully synced bank account ${accountIdStr}` : 'Successfully synced all bank accounts'
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Check if this is an "unsupported feature" error
    if (
      errorMessage.includes(API_UNAVAILABLE_ERROR_FRAGMENT) ||
      errorMessage.includes(METHOD_NOT_FUNCTION_FRAGMENT) ||
      err instanceof TypeError
    ) {
      return unsupportedFeatureError('Bank sync', {
        suggestion:
          'Upgrade your Actual Budget server to a version that supports bank sync or import transactions manually in the Actual app.',
      });
    }

    return errorFromCatch(err);
  }
}
