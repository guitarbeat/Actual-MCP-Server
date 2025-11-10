// Orchestrator for spending-by-category tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SpendingByCategoryInputParser } from './input-parser.js';
import { SpendingByCategoryDataFetcher } from './data-fetcher.js';
import { CategoryMapper } from '../../core/mapping/category-mapper.js';
import { TransactionGrouper } from '../../core/aggregation/transaction-grouper.js';
import { GroupAggregator } from '../../core/aggregation/group-by.js';
import { SpendingByCategoryReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../core/response/index.js';
import type { SpendingByCategoryInput } from './input-parser.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SpendingByCategoryArgsSchema, type SpendingByCategoryArgs, type Account } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';

export const schema = {
  name: 'spending-by-category',
  description:
    'Analyze spending patterns by category groups and individual categories.\n\n' +
    'OPTIONAL FILTERS:\n' +
    '- startDate/endDate: Date range in YYYY-MM-DD format (defaults to last 30 days if omitted)\n' +
    '- accountId: Specific account name/ID or omit for all on-budget accounts\n' +
    '- includeIncome: Include income categories (default: false, expenses only)\n\n' +
    'EXAMPLES:\n' +
    '- Last month: {"startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
    '- Specific account: {"accountId": "Checking", "startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
    '- With income: {"includeIncome": true, "startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
    '- Last quarter: {"startDate": "2024-01-01", "endDate": "2024-03-31"}\n' +
    '- All accounts this month: {"startDate": "2024-01-01", "endDate": "2024-01-31"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Analyze spending breakdown by category for a time period\n' +
    '- Identify top spending categories\n' +
    '- Compare spending across different accounts\n' +
    '- Review category spending trends\n' +
    '- Understand where money is being spent\n' +
    '- Compare income vs expenses by category\n\n' +
    'SEE ALSO:\n' +
    '- Use get-transactions for detailed transaction lists\n' +
    '- Use monthly-summary for high-level monthly financial overview\n' +
    '- Use get-grouped-categories to see all available categories\n' +
    '- Use get-budget to compare spending to budget amounts\n\n' +
    'RETURNS:\n' +
    '- Category groups sorted by spending (highest first)\n' +
    '- Categories within groups with amounts and transaction counts',
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
