// Orchestrator for spending-by-category tool
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GroupAggregator } from '../../core/aggregation/group-by.js';
import { TransactionGrouper } from '../../core/aggregation/transaction-grouper.js';
import { CategoryMapper } from '../../core/mapping/category-mapper.js';
import { errorFromCatch, success } from '../../core/response/index.js';
import { SpendingByCategoryArgsSchema } from '../../core/types/index.js';
import type { ToolInput, Account, SpendingByCategoryArgs } from '../../core/types/index.js';
import { SpendingByCategoryDataFetcher } from './data-fetcher.js';
import type { SpendingByCategoryInput } from './input-parser.js';
import { SpendingByCategoryInputParser } from './input-parser.js';
import { SpendingByCategoryReportGenerator } from './report-generator.js';

export const schema = {
  name: 'spending-by-category',
  description:
    'Break down spending by category to show where money is going. Useful for analyzing spending patterns, top categories, or budget analysis.',
  inputSchema: zodToJsonSchema(SpendingByCategoryArgsSchema) as ToolInput,
};

export async function handler(args: SpendingByCategoryArgs): Promise<CallToolResult> {
  try {
    const input: SpendingByCategoryInput = new SpendingByCategoryInputParser().parse(args);
    const { startDate, endDate, accountId, includeIncome } = input;
    const { accounts, categories, categoryGroups, transactions } =
      await new SpendingByCategoryDataFetcher().fetchAll(accountId, startDate, endDate);
    const categoryMapper = new CategoryMapper(categories, categoryGroups);
    const spendingByCategory = new TransactionGrouper().groupByCategory(
      transactions,
      (categoryId) => categoryMapper.getCategoryName(categoryId),
      (categoryId) => categoryMapper.getGroupInfo(categoryId),
      includeIncome,
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
      includeIncome,
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
