import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MonthlySummaryInputParser } from './input-parser.js';
import { MonthlySummaryDataFetcher } from './data-fetcher.js';
import { CategoryClassifier } from '../../core/mapping/category-classifier.js';
import { MonthlySummaryTransactionAggregator } from './transaction-aggregator.js';
import { MonthlySummaryCalculator } from './summary-calculator.js';
import { MonthlySummaryReportDataBuilder } from './report-data-builder.js';
import { MonthlySummaryReportGenerator } from './report-generator.js';
import { successWithContent, errorFromCatch } from '../../core/response/index.js';
import { getDateRangeForMonths } from '../../utils.js';
import { MonthlySummaryArgsSchema, type MonthlySummaryArgs } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';

export const schema = {
  name: 'monthly-summary',
  description:
    'Generate a comprehensive monthly financial summary showing income, expenses, savings, and savings rates over a specified time period.\n\n' +
    'OPTIONAL PARAMETERS:\n' +
    '- months: Number of months to analyze (default: 3, e.g., 1, 6, 12)\n' +
    '- accountId: Filter to specific account name or ID (omit for all accounts)\n\n' +
    'RETURNED DATA STRUCTURE:\n' +
    '- Monthly breakdown: Income, expenses, investments/savings for each month\n' +
    '- Average calculations: Average monthly income, expenses, traditional savings, total savings\n' +
    '- Savings rates: Traditional savings rate (income - expenses) and total savings rate (including investments)\n' +
    '- Transaction counts: Number of transactions per month\n' +
    '- Date range: Start and end dates of the analysis period\n\n' +
    'EXAMPLES:\n' +
    '- Last 3 months (default): {} or {"months": 3}\n' +
    '- Last 6 months: {"months": 6}\n' +
    '- Last year: {"months": 12}\n' +
    '- Single month: {"months": 1}\n' +
    '- Specific account for 3 months: {"months": 3, "accountId": "Checking"}\n' +
    '- All accounts for 12 months: {"months": 12}\n\n' +
    'COMMON USE CASES:\n' +
    '- Reviewing recent financial trends: Use default 3 months to see quarterly patterns\n' +
    '- Annual financial review: Set months=12 to analyze full year performance\n' +
    '- Account-specific analysis: Add accountId to focus on checking, savings, or credit card\n' +
    '- Savings rate tracking: Compare traditional vs total savings rates over time\n' +
    '- Budget planning: Use averages to set realistic monthly budget targets\n\n' +
    'NOTES:\n' +
    '- Traditional savings = Income - Expenses (excludes investment contributions)\n' +
    '- Total savings = Traditional savings + Investment contributions\n' +
    '- Amounts are displayed in dollars with 2 decimal places\n' +
    '- Months are calculated backwards from today (e.g., months=3 means last 3 months)\n' +
    '- Income categories are automatically identified (salary, wages, etc.)\n' +
    '- Investment categories are automatically identified (401k, IRA, brokerage, etc.)\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use monthly-summary to get high-level financial overview\n' +
    '2. Use spending-by-category to drill into expense categories\n' +
    '3. Use get-transactions to see specific transactions in problem areas\n' +
    '4. Use set-budget to adjust budgets based on actual spending patterns\n\n' +
    'SEE ALSO:\n' +
    '- spending-by-category: Detailed breakdown of expenses by category\n' +
    '- get-transactions: View individual transactions for deeper analysis\n' +
    '- get-accounts: Find account IDs for account-specific summaries\n' +
    '- balance-history: Track account balance trends over time\n' +
    '- set-budget: Adjust budgets based on summary insights',
  inputSchema: zodToJsonSchema(MonthlySummaryArgsSchema) as ToolInput,
};

export async function handler(args: MonthlySummaryArgs): Promise<CallToolResult> {
  try {
    const input = new MonthlySummaryInputParser().parse(args);
    const { start, end } = getDateRangeForMonths(input.months);

    const { accounts, categories, transactions } = await new MonthlySummaryDataFetcher().fetchAll(
      input.accountId,
      start,
      end
    );
    const { incomeCategories, investmentSavingsCategories } = new CategoryClassifier().classify(categories);
    const sortedMonths = new MonthlySummaryTransactionAggregator().aggregate(
      transactions,
      incomeCategories,
      investmentSavingsCategories
    );
    const averages = new MonthlySummaryCalculator().calculateAverages(sortedMonths);
    const reportData = new MonthlySummaryReportDataBuilder().build(
      start,
      end,
      input.accountId,
      accounts,
      sortedMonths,
      averages
    );
    const markdown = new MonthlySummaryReportGenerator().generate(reportData);

    return successWithContent({ type: 'text', text: markdown });
  } catch (err) {
    return errorFromCatch(err, {
      tool: 'monthly-summary',
      operation: 'calculate_monthly_summary',
      args,
    });
  }
}
