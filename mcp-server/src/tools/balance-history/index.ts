// Orchestrator for balance-history tool
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, success } from '../../core/response/index.js';
import { type BalanceHistoryArgs, BalanceHistoryArgsSchema } from '../../core/types/index.js';
import type { ToolInput } from '../../core/types/index.js';
import { formatDate } from '../../core/formatting/index.js';
import { BalanceHistoryCalculator } from './balance-calculator.js';
import { BalanceHistoryDataFetcher } from './data-fetcher.js';
import { BalanceHistoryInputParser } from './input-parser.js';
import { BalanceHistoryReportGenerator } from './report-generator.js';

export const schema = {
  name: 'balance-history',
  description:
    'Track how an account balance has changed over time with monthly snapshots. Use this when the user asks about balance trends or account growth.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "how has my balance changed?"\n' +
    '- User wants to see "balance history" or "balance over time"\n' +
    '- User asks "is my account growing or shrinking?"\n' +
    '- User wants to track "account trends"\n' +
    '- User asks "show me balance for the last X months"\n\n' +
    'REQUIRED:\n' +
    '- accountId: Account name (e.g., "Checking", "Savings")\n' +
    '- months: Number of months to look back (e.g., 3, 6, 12)\n\n' +
    'EXAMPLES:\n' +
    '- "Show checking balance history": {"accountId": "Checking", "months": 6}\n' +
    '- "Savings growth last year": {"accountId": "Savings", "months": 12}\n\n' +
    'RETURNS: Monthly balance snapshots showing growth or decline patterns',
  inputSchema: zodToJsonSchema(BalanceHistoryArgsSchema) as ToolInput,
};

export async function handler(args: BalanceHistoryArgs): Promise<CallToolResult> {
  try {
    const input = new BalanceHistoryInputParser().parse(args);
    const { accountId, months } = input;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    // Fetch data
    const { account, accounts, transactions } = await new BalanceHistoryDataFetcher().fetchAll(accountId, start, end);

    // Calculate balance history
    const sortedMonths = new BalanceHistoryCalculator().calculate(account, accounts, transactions, months, endDate);

    // Generate report
    const markdown = new BalanceHistoryReportGenerator().generate(account, { start, end }, sortedMonths);
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err, {
      tool: 'balance-history',
      operation: 'calculate_balance_history',
      args,
    });
  }
}
