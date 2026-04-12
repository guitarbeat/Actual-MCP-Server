// Orchestrator for balance-history tool
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { formatDate } from '../../core/formatting/index.js';
import { success } from '../../core/response/index.js';
import { BalanceHistoryArgsSchema } from '../../core/types/index.js';
import type { ToolInput, BalanceHistoryArgs } from '../../core/types/index.js';
import { executeToolAction } from '../shared/tool-action.js';
import { BalanceHistoryCalculator } from './balance-calculator.js';
import { BalanceHistoryDataFetcher } from './data-fetcher.js';
import { parseBalanceHistoryInput } from './input-parser.js';
import { generateBalanceHistoryReport } from './report-generator.js';

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
  return executeToolAction(args, {
    parse: (rawArgs) => parseBalanceHistoryInput(rawArgs as BalanceHistoryArgs),
    execute: async (input) => {
      const { accountId, months } = input;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - months);
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      const data = await new BalanceHistoryDataFetcher().fetchAll(accountId, start, end);

      return {
        ...data,
        months,
        endDate,
        start,
        end,
      };
    },
    buildResponse: (
      _input,
      { account, accounts, transactions, warnings, months, endDate, start, end },
    ) => {
      const sortedMonths = new BalanceHistoryCalculator().calculate(
        account,
        accounts,
        transactions,
        months,
        endDate,
      );
      const markdown = generateBalanceHistoryReport(
        account,
        { start, end },
        sortedMonths,
        warnings,
      );

      return success(markdown);
    },
    fallbackMessage: 'Failed to calculate balance history',
    errorContext: {
      tool: 'balance-history',
      operation: 'calculate_balance_history',
      args,
    },
  });
}
