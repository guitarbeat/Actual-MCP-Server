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
    'Generate high-level financial overview showing income, expenses, savings, and savings rate trends. Use this when the user asks about overall financial health or monthly summaries.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "how am I doing financially?"\n' +
    '- User wants to see "monthly summary" or "financial overview"\n' +
    '- User asks about "savings rate" or "how much am I saving?"\n' +
    '- User wants to compare "income vs expenses"\n' +
    '- User asks "show me the last few months"\n' +
    '- User wants to track financial progress over time\n\n' +
    'OPTIONAL PARAMETERS:\n' +
    '- months: Number of months to analyze (default: 3, common: 6, 12)\n' +
    '- accountId: Specific account name or omit for all accounts\n\n' +
    'EXAMPLES:\n' +
    '- "Show financial summary": {}\n' +
    '- "Last year overview": {"months": 12}\n' +
    '- "Checking account summary": {"accountId": "Checking", "months": 6}\n\n' +
    'RETURNS: Monthly income, expenses, savings, averages, and savings rates',
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
    const reportData = new MonthlySummaryReportDataBuilder().build({
      start,
      end,
      accountId: input.accountId,
      accounts,
      sortedMonths,
      averages,
    });
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
