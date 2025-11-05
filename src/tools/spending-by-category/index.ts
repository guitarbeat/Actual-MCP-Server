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
    'Analyze spending patterns by breaking down transactions into category groups and individual categories for a specified date range.\n\n' +
    'RETURNED DATA STRUCTURE:\n' +
    '- Grouped by category groups (e.g., "Food & Dining", "Transportation")\n' +
    '- Each group shows total spending and breakdown by individual categories\n' +
    '- Each category shows amount spent and transaction count\n' +
    '- Groups are sorted by total spending (highest to lowest)\n' +
    '- Categories within groups are sorted by amount (highest to lowest)\n\n' +
    'FILTER OPTIONS:\n' +
    '- startDate/endDate: Define the analysis period (defaults to last 30 days)\n' +
    '- accountId: Analyze a specific account or all on-budget accounts\n' +
    '- includeIncome: Include or exclude income categories (default: expenses only)\n\n' +
    'EXAMPLES:\n' +
    '- Last month expenses: {"startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
    '- Specific account: {"startDate": "2024-01-01", "endDate": "2024-01-31", "accountId": "Checking"}\n' +
    '- Include income: {"startDate": "2024-01-01", "endDate": "2024-01-31", "includeIncome": true}\n' +
    '- Last 30 days all accounts: {} (uses defaults)\n\n' +
    'COMMON USE CASES:\n' +
    '- Identify top spending categories for budget review\n' +
    '- Compare spending patterns across different time periods\n' +
    '- Analyze spending for a specific account (e.g., credit card vs checking)\n' +
    '- Review both income and expenses by category\n' +
    '- Find categories where spending is concentrated\n\n' +
    'NOTES:\n' +
    '- Amounts are displayed in dollars with proper formatting\n' +
    '- Only on-budget accounts are included unless specific account is requested\n' +
    '- Income categories are excluded by default to focus on expenses\n' +
    '- Use get-accounts tool first if you need to find account IDs\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-accounts to find account IDs (optional, for account-specific analysis)\n' +
    '2. Use spending-by-category to see category breakdown for a time period\n' +
    '3. Use get-transactions with categoryName filter to drill into specific categories\n' +
    '4. Use set-budget to adjust budgets based on spending patterns\n\n' +
    'SEE ALSO:\n' +
    '- get-transactions: Drill down into specific categories to see individual transactions\n' +
    '- get-accounts: Find account IDs for account-specific spending analysis\n' +
    '- monthly-summary: Get high-level financial overview including income and expenses\n' +
    '- set-budget: Adjust category budgets based on spending patterns\n' +
    '- get-grouped-categories: View all available categories and groups',
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
