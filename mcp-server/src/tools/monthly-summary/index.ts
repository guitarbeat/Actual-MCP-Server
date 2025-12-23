import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CategoryClassifier } from '../../core/mapping/category-classifier.js';
import { errorFromCatch, successWithContent } from '../../core/response/index.js';
import { type MonthlySummaryArgs, MonthlySummaryArgsSchema } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';
import { getDateRangeForMonths } from '../../utils.js';
import { MonthlySummaryDataFetcher } from './data-fetcher.js';
import { MonthlySummaryInputParser } from './input-parser.js';
import { MonthlySummaryReportDataBuilder } from './report-data-builder.js';
import { MonthlySummaryReportGenerator } from './report-generator.js';
import { MonthlySummaryCalculator } from './summary-calculator.js';
import { MonthlySummaryTransactionAggregator } from './transaction-aggregator.js';

export const schema = {
  name: 'monthly-summary',
  description: 'Generate high-level financial overview showing income, expenses, savings, and savings rate trends for a specified period (default 3 months).',
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
