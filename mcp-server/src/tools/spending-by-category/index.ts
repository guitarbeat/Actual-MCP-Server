// Orchestrator for spending-by-category tool
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GroupAggregator } from '../../core/aggregation/group-by.js';
import { TransactionGrouper } from '../../core/aggregation/transaction-grouper.js';
import { CategoryMapper } from '../../core/mapping/category-mapper.js';
import { errorFromCatch, success } from '../../core/response/index.js';
import { type Account, type SpendingByCategoryArgs, SpendingByCategoryArgsSchema } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';
import { SpendingByCategoryDataFetcher } from './data-fetcher.js';
import type { SpendingByCategoryInput } from './input-parser.js';
import { SpendingByCategoryInputParser } from './input-parser.js';
import { SpendingByCategoryReportGenerator } from './report-generator.js';

export const schema = {
  name: 'spending-by-category',
  description:
    'Break down spending by category to show where money is going. Use this when the user asks about spending patterns, top categories, or budget analysis.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "where is my money going?"\n' +
    '- User wants to see "spending breakdown" or "spending by category"\n' +
    '- User asks "what are my top spending categories?"\n' +
    '- User wants to analyze spending for a time period\n' +
    '- User asks "how much did I spend on [category]?"\n' +
    '- User wants to compare spending across categories\n\n' +
    'OPTIONAL FILTERS:\n' +
    '- startDate/endDate: YYYY-MM-DD format (defaults to last 30 days)\n' +
    '- accountId: Specific account name or omit for all accounts\n' +
    '- includeIncome: Set true to include income categories (default: expenses only)\n\n' +
    'EXAMPLES:\n' +
    '- "Show spending breakdown": {}\n' +
    '- "January spending": {"startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
    '- "Checking account spending": {"accountId": "Checking"}\n' +
    '- "Income and expenses": {"includeIncome": true}\n\n' +
    'RETURNS: Category groups sorted by spending (highest first) with transaction counts',
  inputSchema: zodToJsonSchema(SpendingByCategoryArgsSchema) as ToolInput,
};

export async function handler(args: SpendingByCategoryArgs): Promise<CallToolResult> {
  try {
    const input: SpendingByCategoryInput = new SpendingByCategoryInputParser().parse(args);
    const { startDate, endDate, accountId, includeIncome } = input;
    const { accounts, categories, categoryGroups, transactions } = await new SpendingByCategoryDataFetcher().fetchAll(
      accountId,
      startDate,
      endDate
    );
    const categoryMapper = new CategoryMapper(categories, categoryGroups);
    const spendingByCategory = new TransactionGrouper().groupByCategory(
      transactions,
      (categoryId) => categoryMapper.getCategoryName(categoryId),
      (categoryId) => categoryMapper.getGroupInfo(categoryId),
      includeIncome
    );
    const sortedGroups = new GroupAggregator().aggregateAndSort(spendingByCategory);

    let accountLabel = 'Accounts: All on-budget accounts';
    if (accountId) {
      const account: Account | undefined = accounts.find((a) => a.id === accountId);
      accountLabel = `Account: ${account ? account.name : accountId}`;
    }

    const markdown = new SpendingByCategoryReportGenerator().generate(
      sortedGroups,
      { start: startDate, end: endDate },
      accountLabel,
      includeIncome
    );
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err, {
      tool: 'spending-by-category',
      operation: 'calculate_spending_breakdown',
      args,
    });
  }
}
