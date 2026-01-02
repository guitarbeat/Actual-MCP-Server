// ----------------------------
// FINANCIAL INSIGHTS TOOL
// Pre-analyzed financial summary to reduce context window load
// ----------------------------

import { type FinancialInsightsSummary, generateInsightsSummary } from '../../core/analysis/financial-analyzer.js';
import { formatAmount } from '../../core/formatting/index.js';
import { errorFromCatch, successWithJson } from '../../core/response/index.js';

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
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Month to analyze in YYYY-MM format. Defaults to current month.',
      },
      includeSchedules: {
        type: 'boolean',
        description: 'Include upcoming scheduled transactions. Default: true.',
      },
      scheduleDays: {
        type: 'number',
        description: 'Number of days ahead to look for scheduled transactions. Default: 14.',
      },
    },
    required: [],
  },
};

interface FinancialInsightsArgs {
  month?: string;
  includeSchedules?: boolean;
  scheduleDays?: number;
}

/**
 * Format the insights summary for display
 */
function formatInsights(insights: FinancialInsightsSummary): object {
  return {
    summary: insights.summary,
    month: insights.month,
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
      savingsRate: insights.trends.savingsRate !== null ? `${insights.trends.savingsRate.toFixed(1)}%` : 'N/A',
    },
  };
}

/**
 * Handler for the get-financial-insights tool
 */
export async function handler(
  args: FinancialInsightsArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const insights = await generateInsightsSummary(args.month, {
      includeSchedules: args.includeSchedules,
      scheduleDays: args.scheduleDays,
    });

    return successWithJson(formatInsights(insights));
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to generate financial insights',
      suggestion: 'Check that the month is in YYYY-MM format and try again.',
    });
  }
}
