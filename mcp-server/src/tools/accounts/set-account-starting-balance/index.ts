import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { SetAccountStartingBalanceDataFetcher } from './data-fetcher.js';
import { SetAccountStartingBalanceInputParser } from './input-parser.js';
import { SetAccountStartingBalanceReportGenerator } from './report-generator.js';
import { SetAccountStartingBalanceArgsSchema } from './types.js';

export const schema = {
  name: 'set-account-starting-balance',
  description:
    'Create or update the single starting balance transaction for an existing account.\n\n' +
    'WHEN TO USE:\n' +
    '- An imported account is missing its opening balance\n' +
    '- Current balances are wrong because the initial balance was never set\n' +
    '- You need to repair a starting balance without recreating the account\n\n' +
    'REQUIRED:\n' +
    '- account: Account name or ID\n' +
    '- amount: Starting balance in dollars or cents\n\n' +
    'OPTIONAL:\n' +
    '- date: Effective date in YYYY-MM-DD format\n' +
    '- notes: Notes for the starting balance transaction\n\n' +
    'NOTES:\n' +
    '- If no date is provided, the tool uses the day before the earliest non-starting-balance transaction\n' +
    '- If a starting balance transaction already exists, it is updated instead of creating a duplicate',
  inputSchema: zodToJsonSchema(SetAccountStartingBalanceArgsSchema) as ToolInput,
};

export async function handler(
  args: unknown,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = new SetAccountStartingBalanceInputParser().parse(args);
    const fetcher = new SetAccountStartingBalanceDataFetcher();
    const plan = await fetcher.buildPlan(parsed);
    const result = await fetcher.applyPlan(plan);

    return successWithJson(new SetAccountStartingBalanceReportGenerator().generate(result));
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to set account starting balance',
      suggestion:
        'Verify the account reference, starting balance amount, and optional date before retrying.',
    });
  }
}
