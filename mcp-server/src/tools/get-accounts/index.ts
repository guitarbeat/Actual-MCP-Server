// Orchestrator for get-accounts tool

import { zodToJsonSchema } from 'zod-to-json-schema';
import { successWithJson } from '../../core/response/index.js';
import { GetAccountsArgsSchema } from '../../core/types/index.js';
import type { ToolInput, GetAccountsArgs } from '../../core/types/index.js';
import { executeToolAction } from '../shared/tool-action.js';
import { fetchAccounts } from './data-fetcher.js';
import { parseGetAccountsInput } from './input-parser.js';
import { generateAccountsReport } from './report-generator.js';

export const schema = {
  name: 'get-accounts',
  description:
    'List all accounts with current balances. Use this when the user asks about accounts, balances, or needs to find an account name.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "what accounts do I have?"\n' +
    '- User wants to see "account balances" or "current balance"\n' +
    '- User asks "how much is in my checking account?"\n' +
    '- You need to find the correct account name for another tool\n' +
    '- User wants to see "all my accounts"\n\n' +
    'OPTIONAL FILTERS:\n' +
    '- accountId: Partial account name to search (e.g., "Chase" finds "Chase Checking")\n' +
    '- includeClosed: Set true to include closed accounts (default: false)\n\n' +
    'EXAMPLES:\n' +
    '- "Show all accounts": {}\n' +
    '- "Find Chase accounts": {"accountId": "Chase"}\n' +
    '- "Include closed accounts": {"includeClosed": true}\n\n' +
    'RETURNS: Account names, computed ledger balances, optional reported bank balances, types, and status',
  inputSchema: zodToJsonSchema(GetAccountsArgsSchema) as ToolInput,
};

export async function handler(args: GetAccountsArgs = {}) {
  return executeToolAction(args, {
    parse: (rawArgs) => parseGetAccountsInput(rawArgs as GetAccountsArgs),
    execute: async (parsed) =>
      fetchAccounts({
        accountId: parsed.accountId,
        includeClosed: parsed.includeClosed,
      }),
    buildResponse: (_parsed, { accounts, warnings }) =>
      successWithJson(generateAccountsReport(accounts, warnings)),
    fallbackMessage: 'Failed to retrieve accounts from Actual.',
    suggestion:
      'Verify the Actual Budget server is reachable and that the service user has permission to list accounts.',
  });
}
