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
    'Retrieve a list of accounts with their current balance and ID. Filter by account name/ID or include closed accounts. Balance is always included by default.',
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
