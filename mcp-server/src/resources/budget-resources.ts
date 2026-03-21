import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { getBudgetMonth, getBudgetMonths } from '../core/api/actual-client.js';
import { formatAmount } from '../core/formatting/index.js';

interface CategoryData {
  name: string;
  received?: number;
  budgeted?: number;
  spent?: number;
  balance?: number;
  carryover?: boolean;
}

interface CategoryGroupData {
  name: string;
  is_income?: boolean;
  budgeted?: number;
  spent?: number;
  balance?: number;
  categories?: CategoryData[];
}

interface BudgetMonthData {
  totalIncome?: number;
  totalBudgeted?: number;
  totalSpent?: number;
  totalBalance?: number;
  toBudget?: number;
  fromLastMonth?: number;
  lastMonthOverspent?: number;
  forNextMonth?: number;
  categoryGroups?: CategoryGroupData[];
}

export const BUDGET_RESOURCE_TEMPLATES = [
  {
    name: 'budgets-directory',
    title: 'Budget Months',
    uriTemplate: 'actual://budgets',
    description: 'Lists relevant budget months (3 months back, current month, 2 months forward).',
    mimeType: 'text/markdown',
  },
  {
    name: 'budget-month',
    title: 'Monthly Budget',
    uriTemplate: 'actual://budgets/{month}',
    description: 'Detailed budget breakdown for a specific month (YYYY-MM format).',
    mimeType: 'text/markdown',
  },
];

export const BUDGET_LIST_RESOURCES = [
  {
    uri: 'actual://budgets',
    name: 'Budget Months Directory',
    description:
      'Browse budget months. Use the get-budget-month tool to retrieve detailed budget data for specific months.',
    mimeType: 'text/markdown',
  },
];

function filterRelevantBudgetMonths(months: string[]): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const relevantMonths: string[] = [];

  for (let offset = -3; offset <= 2; offset += 1) {
    const monthDate = new Date(currentYear, currentMonth - 1 + offset, 1);
    relevantMonths.push(
      `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
    );
  }

  return months.filter((month) => relevantMonths.includes(month));
}

function formatBudgetSummary(data: BudgetMonthData): string {
  const {
    totalIncome = 0,
    totalBudgeted = 0,
    totalSpent = 0,
    totalBalance = 0,
    toBudget = 0,
    fromLastMonth = 0,
    lastMonthOverspent = 0,
    forNextMonth = 0,
  } = data;

  let markdown = '## Summary\n\n';
  markdown += '| Metric | Amount |\n';
  markdown += '|--------|--------|\n';
  markdown += `| Total Income | ${formatAmount(totalIncome)} |\n`;
  markdown += `| Total Budgeted | ${formatAmount(totalBudgeted)} |\n`;
  markdown += `| Total Spent | ${formatAmount(totalSpent)} |\n`;
  markdown += `| Total Balance | ${formatAmount(totalBalance)} |\n`;
  markdown += `| Available to Budget | ${formatAmount(toBudget)} |\n`;

  if (fromLastMonth !== 0) {
    markdown += `| From Last Month | ${formatAmount(fromLastMonth)} |\n`;
  }
  if (lastMonthOverspent !== 0) {
    markdown += `| Last Month Overspent | ${formatAmount(lastMonthOverspent)} |\n`;
  }
  if (forNextMonth !== 0) {
    markdown += `| Held for Next Month | ${formatAmount(forNextMonth)} |\n`;
  }

  return `${markdown}\n`;
}

function formatCategoryGroups(categoryGroups: CategoryGroupData[] | undefined): string {
  if (!categoryGroups || categoryGroups.length === 0) {
    return '';
  }

  return categoryGroups
    .map((group) => {
      if (group.is_income) {
        const rows = (group.categories ?? [])
          .map((category) => `| ${category.name} | ${formatAmount(category.received || 0)} |`)
          .join('\n');

        return `### ${group.name}\n\n| Category | Received |\n|----------|----------|\n${rows}\n`;
      }

      const rows = (group.categories ?? [])
        .map((category) => {
          const carryover = category.carryover ? ' ✓' : '';
          return `| ${category.name} | ${formatAmount(category.budgeted || 0)} | ${formatAmount(
            Math.abs(category.spent || 0),
          )} | ${formatAmount(category.balance || 0)}${carryover} |`;
        })
        .join('\n');

      return `### ${group.name}\n\n**Group Total**: Budgeted ${formatAmount(
        group.budgeted || 0,
      )}, Spent ${formatAmount(Math.abs(group.spent || 0))}, Balance ${formatAmount(
        group.balance || 0,
      )}\n\n| Category | Budgeted | Spent | Balance |\n|----------|----------|-------|----------|\n${rows}\n`;
    })
    .join('\n');
}

function formatBudgetMonth(budgetData: BudgetMonthData, month: string): string {
  return `# Budget: ${month}\n\n${formatBudgetSummary(budgetData)}## Category Groups\n\n${formatCategoryGroups(
    budgetData.categoryGroups,
  )}`;
}

export async function handleBudgetsResource(
  uri: string,
  pathParts: string[],
): Promise<ReadResourceResult> {
  if (pathParts.length === 0) {
    const months = filterRelevantBudgetMonths(await getBudgetMonths());
    return {
      contents: [
        {
          uri,
          text: `# Actual Budget Months\n\nShowing relevant months (3 months back, current month, 2 months forward):\n\n${months
            .map((month) => `- ${month}`)
            .join('\n')}\n\nTotal Months: ${months.length}`,
          mimeType: 'text/markdown',
        },
      ],
    };
  }

  if (pathParts.length === 1) {
    const month = pathParts[0];

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return {
        contents: [
          { uri, text: `Error: Invalid month format (YYYY-MM): ${month}`, mimeType: 'text/plain' },
        ],
      };
    }

    try {
      const budgetData = (await getBudgetMonth(month)) as BudgetMonthData;
      return {
        contents: [
          {
            uri,
            text: formatBudgetMonth(budgetData, month),
            mimeType: 'text/markdown',
          },
        ],
      };
    } catch {
      return {
        contents: [
          { uri, text: `Error: Budget data not found for ${month}`, mimeType: 'text/plain' },
        ],
      };
    }
  }

  return {
    contents: [
      { uri, text: `Error: Unrecognized budget resource: ${uri}`, mimeType: 'text/plain' },
    ],
  };
}
