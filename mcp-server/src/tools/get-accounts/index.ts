// Orchestrator for get-accounts tool

import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, successWithJson } from '../../core/response/index.js';
import type {
  ToolInput,
  type GetAccountsArgs,
  GetAccountsArgsSchema,
} from '../../core/types/index.js';
import { GetAccountsDataFetcher } from './data-fetcher.js';
import { GetAccountsInputParser } from './input-parser.js';
import { GetAccountsReportGenerator } from './report-generator.js';

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
    'RETURNS: Account names, balances, types, and status',
  inputSchema: zodToJsonSchema(GetAccountsArgsSchema) as ToolInput,
};

export async function handler(
  args: GetAccountsArgs = {},
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    // Parse input
    const parser = new GetAccountsInputParser();
    const parsed = parser.parse(args);

    // Fetch accounts with balances
    const accounts = await new GetAccountsDataFetcher().fetchAccounts({
      accountId: parsed.accountId,
      includeClosed: parsed.includeClosed,
    });

    // Generate formatted report
    const structured = new GetAccountsReportGenerator().generate(accounts);

    return successWithJson(structured);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to retrieve accounts from Actual.',
      suggestion:
        'Verify the Actual Budget server is reachable and that the service user has permission to list accounts.',
    });
  }
}
