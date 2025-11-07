// Orchestrator for get-accounts tool

import { zodToJsonSchema } from 'zod-to-json-schema';
import { successWithJson, errorFromCatch } from '../../core/response/index.js';
import { GetAccountsArgsSchema, type GetAccountsArgs } from '../../core/types/index.js';
import { type ToolInput } from '../../types.js';
import { GetAccountsInputParser } from './input-parser.js';
import { GetAccountsDataFetcher } from './data-fetcher.js';
import { GetAccountsReportGenerator } from './report-generator.js';

export const schema = {
  name: 'get-accounts',
  description:
    'Retrieve all accounts with current balances and metadata.\n\n' +
    'OPTIONAL FILTERS:\n' +
    '- accountId: Filter by account name or ID (supports exact and partial name matching)\n' +
    '- includeClosed: Include closed accounts (default: false)\n\n' +
    'EXAMPLES:\n' +
    '- All accounts: {}\n' +
    '- Find account by partial name: {"accountId": "Chase"}\n' +
    '- Find account by exact name: {"accountId": "Chase Checking"}\n' +
    '- Include closed: {"includeClosed": true}\n\n' +
    'COMMON USE CASES:\n' +
    '- List all accounts to find account IDs for other tools\n' +
    '- Check current account balances\n' +
    '- Find account by name before using in other operations\n' +
    '- View account types and status\n' +
    '- Get account metadata for transaction operations\n\n' +
    'SEE ALSO:\n' +
    '- Use with get-transactions, balance-history, or monthly-summary (requires accountId)\n' +
    '- Use with manage-entity to modify account properties or create transactions\n\n' +
    'RETURNS:\n' +
    '- Account ID, name, balance, type, status\n' +
    '- Use account IDs with other tools\n' +
    '- Partial name matches return all matching accounts',
  inputSchema: zodToJsonSchema(GetAccountsArgsSchema) as ToolInput,
};

export async function handler(
  args: GetAccountsArgs = {}
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
