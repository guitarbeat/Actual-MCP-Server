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
    'Get account balance history over time, showing how the balance changed month by month.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- accountId: Account name or ID (use get-accounts to find account IDs)\n' +
    '- months: Number of months of history to retrieve (e.g., 3, 6, 12)\n\n' +
    'RETURNED DATA:\n' +
    '- Monthly balance snapshots showing balance at the end of each month\n' +
    '- Balance changes over the specified time period\n' +
    '- Account name and date range\n\n' +
    'EXAMPLES:\n' +
    '- Last 6 months: {"accountId": "Checking", "months": 6}\n' +
    '- Last year: {"accountId": "Savings", "months": 12}\n' +
    '- Last quarter: {"accountId": "Credit Card", "months": 3}\n\n' +
    'COMMON USE CASES:\n' +
    '- Tracking account balance trends over time\n' +
    '- Identifying unusual balance changes\n' +
    '- Monitoring savings account growth\n' +
    '- Reviewing credit card balance patterns\n\n' +
    'NOTES:\n' +
    '- Balances are calculated at the end of each month\n' +
    '- Accepts account name or ID (use get-accounts to find IDs)\n' +
    '- Months parameter determines how far back to look from today\n' +
    '- Balances include all transactions up to the end of each month\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-accounts to find account ID or name\n' +
    '2. Use balance-history to view balance trends\n' +
    '3. Use get-transactions to investigate specific months with unusual changes\n' +
    '4. Use monthly-summary for overall financial trends across all accounts\n\n' +
    'SEE ALSO:\n' +
    '- get-accounts: Find account IDs before querying balance history\n' +
    '- manage-account: Query current balance for a specific date\n' +
    '- monthly-summary: View overall financial trends including all accounts\n' +
    '- get-transactions: View transactions that caused balance changes',
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
