// Orchestrator for balance-history tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BalanceHistoryInputParser } from './input-parser.js';
import { BalanceHistoryDataFetcher } from './data-fetcher.js';
import { BalanceHistoryCalculator } from './balance-calculator.js';
import { BalanceHistoryReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../core/response/index.js';
import { formatDate } from '../../utils.js';
import { BalanceHistoryArgsSchema, type BalanceHistoryArgs } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const schema = {
  name: 'balance-history',
  description:
    'Get account balance history showing monthly balance changes.\n\n' +
    'REQUIRED:\n' +
    '- accountId: Account name or ID\n' +
    '- months: Number of months (e.g., 3, 6, 12)\n\n' +
    'EXAMPLES:\n' +
    '- Last 6 months: {"accountId": "Checking", "months": 6}\n' +
    '- Last year: {"accountId": "Savings", "months": 12}\n\n' +
    'COMMON USE CASES:\n' +
    '- Track account balance trends over time\n' +
    '- Analyze balance changes month-over-month\n' +
    '- Review account growth or decline patterns\n' +
    '- Generate balance history reports\n' +
    '- Understand account activity patterns\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account IDs\n' +
    '- Use get-transactions to see transaction details affecting balances\n' +
    '- Use monthly-summary for high-level financial overview\n\n' +
    'RETURNS:\n' +
    '- Monthly balance snapshots\n' +
    '- Balance changes over time',
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
