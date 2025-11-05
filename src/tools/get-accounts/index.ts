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
    'Retrieve all accounts with current balances and metadata. Essential for getting account IDs before using other tools like manage-transaction, get-transactions, or manage-account.\n\n' +
    'RETURNED DATA STRUCTURE:\n' +
    '- Account ID (UUID) - Use this for other tools that require account IDs\n' +
    '- Account name - Human-readable account name\n' +
    '- Current balance - Balance in cents (e.g., 50000 = $500.00)\n' +
    '- Account type - checking, savings, credit, investment, mortgage, debt, or other\n' +
    '- Status - open or closed\n' +
    '- On-budget flag - Whether account is included in budget calculations\n' +
    '- Off-budget flag - Whether account is excluded from budget\n\n' +
    'OPTIONAL PARAMETERS:\n' +
    '- accountId: Filter by specific account name or ID (partial match supported)\n' +
    '- includeClosed: Include closed accounts in results (default: false)\n\n' +
    'EXAMPLES:\n' +
    '- List all open accounts: {} or no arguments\n' +
    '- Find specific account: {"accountId": "Checking"}\n' +
    '- Search by partial name: {"accountId": "Chase"}\n' +
    '- Include closed accounts: {"includeClosed": true}\n' +
    '- Find and include closed: {"accountId": "Savings", "includeClosed": true}\n\n' +
    'COMMON USE CASES:\n' +
    '- Getting account IDs before creating transactions with manage-transaction\n' +
    '- Getting account IDs before querying transactions with get-transactions\n' +
    '- Checking current balances across all accounts\n' +
    '- Finding closed accounts to reopen with manage-account\n' +
    '- Verifying account names before performing operations\n' +
    '- Listing all accounts to understand budget structure\n\n' +
    'WORKFLOW GUIDANCE:\n' +
    '- Use this tool FIRST when you need an account ID for other operations\n' +
    '- The returned account ID can be used directly in manage-transaction, get-transactions, manage-account, and other account-related tools\n' +
    '- Account names support partial matching, so "Check" will find "Checking Account"\n' +
    '- Both account names and IDs are accepted by most tools, but IDs are more reliable for exact matches\n\n' +
    'NOTES:\n' +
    '- Balances are always included in the response (no need to request separately)\n' +
    '- Closed accounts are excluded by default to reduce clutter\n' +
    '- Credit card accounts typically show negative balances (representing debt)\n' +
    '- Off-budget accounts (like tracking accounts) are included but flagged separately',
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
