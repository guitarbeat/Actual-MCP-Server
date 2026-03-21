// ----------------------------
// FINANCIAL INSIGHTS TOOL
// Pre-analyzed financial summary to reduce context window load
// ----------------------------

import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  type FinancialInsightsSummary,
  generateInsightsSummary,
} from '../../core/analysis/financial-analyzer.js';
import { formatAmount } from '../../core/formatting/index.js';
import { errorFromCatch, successWithJson } from '../../core/response/index.js';
import type { ToolInput } from '../../core/types/index.js';
import { FinancialInsightsArgsSchema } from '../../core/types/schemas.js';

export const schema = {
  name: 'get-financial-insights',
  description:
    'Get a pre-analyzed financial health summary. Returns actionable insights instead of raw data.\\n\\n' +
    'WHEN TO USE:\\n' +
    '- User asks "how is my budget doing?"\\n' +
    '- User wants to know about overspending\\n' +
    '- User asks "any issues with my finances?"\\n' +
    '- User wants a quick financial checkup\\n\\n' +
    'RETURNS:\\n' +
    '- Overspending categories (budget vs actual)\\n' +
    '- Uncategorized transactions summary\\n' +
    '- Account health (negative/low balances)\\n' +
    '- Upcoming scheduled transactions\\n' +
    '- Spending trends vs last month\\n\\n' +
    'EXAMPLES:\\n' +
    '- Quick check: {}\\n' +
    '- Specific month: {"month": "2024-01"}\\n' +
    '- Extended forecast: {"scheduleDays": 30}\\n\\n' +
    'NOTE: This tool performs server-side analysis to provide concise insights.',
  inputSchema: zodToJsonSchema(FinancialInsightsArgsSchema) as ToolInput,
};

/**
 * Format the insights summary for display
 */
function formatInsights(insights: FinancialInsightsSummary): object {
  return {
    summary: insights.summary,
    month: insights.month,
    partial: insights.partial,
    warnings: insights.warnings,
    overspending:
      insights.overspending.length > 0
        ? insights.overspending.map((item) => ({
            category: `${item.groupName} > ${item.categoryName}`,
            budgeted: formatAmount(item.budgeted),
            spent: formatAmount(item.spent),
            overage: formatAmount(item.overage),
          }))
        : 'None',
    uncategorized:
      insights.uncategorized.count > 0
        ? {
            count: insights.uncategorized.count,
            total: formatAmount(insights.uncategorized.totalAmount),
            topPayees: insights.uncategorized.topPayees.slice(0, 3),
          }
        : 'None',
    accountHealth: insights.accountHealth
      .filter((a) => a.status !== 'healthy')
      .map((a) => ({
        account: a.name,
        balance: formatAmount(a.balance),
        status: a.status,
      })),
    upcomingSchedules:
      insights.upcomingSchedules.length > 0
        ? insights.upcomingSchedules.slice(0, 5).map((s) => ({
            name: s.name,
            amount: formatAmount(s.amount),
            date: s.nextDate,
          }))
        : 'None',
    trends: {
      thisMonth: formatAmount(insights.trends.currentMonthSpending),
      lastMonth: formatAmount(insights.trends.previousMonthSpending),
      change: `${insights.trends.spendingChange > 0 ? '+' : ''}${insights.trends.spendingChange.toFixed(1)}%`,
      savingsRate:
        insights.trends.savingsRate !== null ? `${insights.trends.savingsRate.toFixed(1)}%` : 'N/A',
    },
  };
}

/**
 * Handler for the get-financial-insights tool
 */
export async function handler(
  args: unknown,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const input = FinancialInsightsArgsSchema.parse(args);
    const insights = await generateInsightsSummary(input.month, {
      includeSchedules: input.includeSchedules,
      scheduleDays: input.scheduleDays,
    });

    return successWithJson(formatInsights(insights));
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to generate financial insights',
      suggestion: 'Check that the month is in YYYY-MM format and try again.',
    });
  }
}
