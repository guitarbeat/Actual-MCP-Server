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
    'Generate monthly financial summary showing income, expenses, savings, and savings rates.\n\n' +
    'OPTIONAL PARAMETERS:\n' +
    '- months: Number of months to analyze (default: 3)\n' +
    '- accountId: Filter to specific account (omit for all accounts)\n\n' +
    'EXAMPLES:\n' +
    '- Last 3 months: {}\n' +
    '- Last year: {"months": 12}\n' +
    '- Specific account: {"months": 6, "accountId": "Checking"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Get high-level financial overview across multiple months\n' +
    '- Track savings rate trends over time\n' +
    '- Compare income vs expenses month-over-month\n' +
    '- Analyze financial health and progress\n' +
    '- Generate monthly financial reports\n\n' +
    'SEE ALSO:\n' +
    '- Use spending-by-category for detailed category breakdowns\n' +
    '- Use get-transactions for specific transaction details\n' +
    '- Use balance-history to track account balance changes\n\n' +
    'RETURNS:\n' +
    '- Monthly income, expenses, savings\n' +
    '- Average monthly amounts\n' +
    '- Savings rates (traditional and total including investments)',
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
