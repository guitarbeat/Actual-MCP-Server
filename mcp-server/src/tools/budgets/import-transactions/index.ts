// ----------------------------
// IMPORT TRANSACTIONS TOOL
// ----------------------------

import { runBankSync } from '../../../core/api/actual-client.js';
import {
  errorFromCatch,
  successWithJson,
  unsupportedFeatureError,
  validationError,
} from '../../../core/response/index.js';

const API_UNAVAILABLE_ERROR_FRAGMENT = 'not available in this version of the API';
const METHOD_NOT_FUNCTION_FRAGMENT = 'is not a function';

export const schema = {
  name: 'import-transactions',
  description:
    'Sync transactions from connected bank accounts to update your budget. Use this when the user wants to refresh bank data.\n\n' +
    'WHEN TO USE:\n' +
    '- User says "sync my bank accounts"\n' +
    '- User wants to "import new transactions"\n' +
    '- User asks to "update from bank"\n' +
    '- User says "refresh transactions"\n' +
    '- User wants to "pull latest bank data"\n\n' +
    'REQUIRED:\n' +
    '- source: Must be "bank"\n\n' +
    'OPTIONAL:\n' +
    '- accountId: Specific account ID (omit to sync all accounts)\n\n' +
    'EXAMPLES:\n' +
    '- "Sync all accounts": {"source": "bank"}\n' +
    '- "Sync one account": {"source": "bank", "accountId": "abc-123"}\n\n' +
    'NOTES:\n' +
    '- Requires configured bank connections\n' +
    '- CSV/file imports must be done through Actual Budget UI',
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
  args: Record<string, unknown>,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { source, accountId } = args;

    if (!source || source !== 'bank') {
      return validationError('source must be "bank"', {
        field: 'source',
        expected: '"bank"',
      });
    }

    const accountIdStr = accountId && typeof accountId === 'string' ? accountId : undefined;
    await runBankSync(accountIdStr);
    return successWithJson(
      accountIdStr
        ? `Successfully synced bank account ${accountIdStr}`
        : 'Successfully synced all bank accounts',
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
