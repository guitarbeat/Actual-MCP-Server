import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getDateRangeForMonths } from '../../core/formatting/index.js';
import { CategoryClassifier } from '../../core/mapping/category-classifier.js';
import { successWithContent } from '../../core/response/index.js';
import { MonthlySummaryArgsSchema } from '../../core/types/index.js';
import type { ToolInput, MonthlySummaryArgs } from '../../core/types/index.js';
import { executeToolAction } from '../shared/tool-action.js';
import { MonthlySummaryDataFetcher } from './data-fetcher.js';
import { parseMonthlySummaryInput } from './input-parser.js';
import { MonthlySummaryReportDataBuilder } from './report-data-builder.js';
import { generateMonthlySummaryReport } from './report-generator.js';
import { MonthlySummaryCalculator } from './summary-calculator.js';
import { MonthlySummaryTransactionAggregator } from './transaction-aggregator.js';

export const schema = {
  name: 'monthly-summary',
  description:
    'Generate high-level financial overview showing income, expenses, savings, and savings rate trends for a specified period (default 3 months).',
  inputSchema: zodToJsonSchema(MonthlySummaryArgsSchema) as ToolInput,
};

export async function handler(args: MonthlySummaryArgs): Promise<CallToolResult> {
  return executeToolAction(args, {
    parse: parseMonthlySummaryInput,
    execute: async (input) => {
      const { start, end } = getDateRangeForMonths(input.months);
      const data = await new MonthlySummaryDataFetcher().fetchAll(input.accountId, start, end);

      return {
        ...data,
        accountId: input.accountId,
        start,
        end,
      };
    },
    buildResponse: (
      _input,
      { accounts, categories, transactions, warnings, accountId, start, end },
    ) => {
      const { incomeCategories, investmentSavingsCategories } = new CategoryClassifier().classify(
        categories,
      );
      const sortedMonths = new MonthlySummaryTransactionAggregator().aggregate(
        transactions,
        incomeCategories,
        investmentSavingsCategories,
      );
      const averages = new MonthlySummaryCalculator().calculateAverages(sortedMonths);
      const reportData = new MonthlySummaryReportDataBuilder().build({
        start,
        end,
        accountId,
        accounts,
        sortedMonths,
        averages,
      });
      const markdown = generateMonthlySummaryReport(reportData, warnings);

      return successWithContent({ type: 'text', text: markdown });
    },
    fallbackMessage: 'Failed to calculate monthly summary',
    errorContext: {
      tool: 'monthly-summary',
      operation: 'calculate_monthly_summary',
      args,
    },
  });
}
