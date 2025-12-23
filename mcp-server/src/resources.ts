// ----------------------------
// RESOURCES
// ----------------------------

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  getAccountBalance,
  getAccounts,
  getBudgetMonth,
  getBudgetMonths,
  getTransactions,
  initActualApi,
} from './core/api/actual-client.js';
// Import types from core/types
import type { Account, Transaction } from './core/types/index.js';
import { formatAmount, formatDate, getDateRange } from './core/formatting/index.js';

/**
 * Filter budget months to show only relevant months:
 * - 3 months backward from present
 * - Current month
 * - 2 months future
 *
 * @param months - Array of month strings in YYYY-MM format
 * @returns Filtered array of months within the relevant range
 */
function filterRelevantBudgetMonths(months: string[]): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

  // Calculate the range: 3 months back to 2 months forward
  const startMonth = currentMonth - 3;
  const endMonth = currentMonth + 2;

  // Generate all months in the range
  const relevantMonths: string[] = [];
  for (let i = startMonth; i <= endMonth; i++) {
    let year = currentYear;
    let month = i;

    // Handle year rollover for months before January
    if (month < 1) {
      month += 12;
      year -= 1;
    }
    // Handle year rollover for months after December
    else if (month > 12) {
      month -= 12;
      year += 1;
    }

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    relevantMonths.push(monthStr);
  }

  // Filter the provided months to only include those in the relevant range
  return months.filter((month) => relevantMonths.includes(month));
}

export const RESOURCE_TEMPLATES = [
  {
    name: 'accounts-directory',
    title: 'Account Directory',
    uriTemplate: 'actual://accounts',
    description: 'Lists all accounts with balance, status, and budget placement.',
    mimeType: 'text/markdown',
  },
  {
    name: 'account-overview',
    title: 'Account Overview',
    uriTemplate: 'actual://accounts/{accountId}',
    description: 'Provides balance, status, and metadata for a specific account.',
    mimeType: 'text/markdown',
  },
  {
    name: 'account-transactions',
    title: 'Account Transactions',
    uriTemplate: 'actual://accounts/{accountId}/transactions',
    description: 'Shows recent transactions for an account across the default reporting window.',
    mimeType: 'text/markdown',
  },
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

export const setupResources = (server: Server): void => {
  /**
   * Handler for listing available resources (accounts and budgets)
   */
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      await initActualApi();

      const resources = [
        {
          uri: 'actual://accounts',
          name: 'Accounts Directory',
          description: 'Browse all accounts. Use the get-accounts tool for detailed account information and balances.',
          mimeType: 'text/markdown',
        },
        {
          uri: 'actual://budgets',
          name: 'Budget Months Directory',
          description:
            'Browse budget months. Use the get-budget tool to retrieve detailed budget data for specific months.',
          mimeType: 'text/markdown',
        },
      ];
      return {
        resources,
      };
    } catch (error) {
      console.error('Error listing resources:', error);
      throw error;
    }
  });

  /**
   * Handler for listing available resource templates
   */
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
      resourceTemplates: RESOURCE_TEMPLATES,
    };
  });

  /**
   * Handler for reading resources (account details and transactions)
   */
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      await initActualApi();
      const uri: string = request.params.uri;
      const url = new URL(uri);

      // Parse the path to determine what to return
      const pathParts: string[] = url.pathname.split('/').filter(Boolean);

      // If the path is just "accounts", return list of all accounts
      if (pathParts.length === 0 && url.hostname === 'accounts') {
        const accounts: Account[] = await getAccounts();

        const accountsText: string = accounts
          .map((account) => {
            const closed = account.closed ? ' (CLOSED)' : '';
            const offBudget = account.offbudget ? ' (OFF BUDGET)' : '';
            const balance = account.balance !== undefined ? ` - ${formatAmount(account.balance)}` : '';

            return `- ${account.name}${closed}${offBudget}${balance} [ID: ${account.id}]`;
          })
          .join('\n');

        return {
          contents: [
            {
              uri: uri,
              text: `# Actual Budget Accounts\n\n${accountsText}\n\nTotal Accounts: ${accounts.length}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }

      // If the path is "accounts/{id}", return account details
      if (pathParts.length === 1 && url.hostname === 'accounts') {
        const accountId: string = pathParts[0];
        const accounts: Account[] = await getAccounts();
        const account: Account | undefined = accounts.find((a) => a.id === accountId);

        if (!account) {
          return {
            contents: [
              {
                uri: uri,
                text: `Error: Account with ID ${accountId} not found`,
                mimeType: 'text/plain',
              },
            ],
          };
        }

        const balance: number = await getAccountBalance(accountId);
        const formattedBalance: string = formatAmount(balance);

        const details = `# Account: ${account.name}

ID: ${account.id}
Type: ${account.type || 'Unknown'}
Balance: ${formattedBalance}
On Budget: ${!account.offbudget}
Status: ${account.closed ? 'Closed' : 'Open'}

To view transactions for this account, use the get-transactions tool.`;

        return {
          contents: [
            {
              uri: uri,
              text: details,
              mimeType: 'text/markdown',
            },
          ],
        };
      }

      // If the path is "accounts/{id}/transactions", return transactions
      if (pathParts.length === 2 && pathParts[1] === 'transactions' && url.hostname === 'accounts') {
        const accountId: string = pathParts[0];
        const { startDate, endDate } = getDateRange();
        const transactions: Transaction[] = await getTransactions(accountId, startDate, endDate);

        if (!transactions || transactions.length === 0) {
          return {
            contents: [
              {
                uri: uri,
                text: `No transactions found for account ID ${accountId} between ${startDate} and ${endDate}`,
                mimeType: 'text/plain',
              },
            ],
          };
        }

        // Create a markdown table of transactions
        const header = '| Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- |\n';
        const rows: string = transactions
          .map((t) => {
            const amount: string = formatAmount(t.amount);
            const date: string = formatDate(t.date);
            const payee: string = t.payee_name || '(No payee)';
            const category: string = t.category_name || '(Uncategorized)';
            const notes: string = t.notes || '';

            return `| ${date} | ${payee} | ${category} | ${amount} | ${notes} |`;
          })
          .join('\n');

        const text = `# Transactions for Account\n\nTime period: ${startDate} to ${endDate}\nTotal Transactions: ${transactions.length}\n\n${header}${rows}`;

        return {
          contents: [
            {
              uri: uri,
              text: text,
              mimeType: 'text/markdown',
            },
          ],
        };
      }

      // If the path is just "budgets", return list of relevant budget months
      if (pathParts.length === 0 && url.hostname === 'budgets') {
        const allMonths: string[] = await getBudgetMonths();
        const months: string[] = filterRelevantBudgetMonths(allMonths);

        const monthsText: string = months.map((month) => `- ${month}`).join('\n');

        return {
          contents: [
            {
              uri: uri,
              text: `# Actual Budget Months\n\nShowing relevant months (3 months back, current month, 2 months forward):\n\n${monthsText}\n\nTotal Months: ${months.length}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }

      // If the path is "budgets/{month}", return budget details
      if (pathParts.length === 1 && url.hostname === 'budgets') {
        const month: string = pathParts[0];

        // Validate month format (YYYY-MM)
        if (!/^\d{4}-\d{2}$/.test(month)) {
          return {
            contents: [
              {
                uri: uri,
                text: `Error: Invalid month format. Expected YYYY-MM format (e.g., 2024-01), got: ${month}`,
                mimeType: 'text/plain',
              },
            ],
          };
        }

        try {
          const budgetData = await getBudgetMonth(month);
          const formattedBudget = formatBudgetMonth(budgetData as BudgetMonthData, month);

          return {
            contents: [
              {
                uri: uri,
                text: formattedBudget,
                mimeType: 'text/markdown',
              },
            ],
          };
        } catch (_error) {
          return {
            contents: [
              {
                uri: uri,
                text: `Error: Budget data for month ${month} not found or could not be retrieved.`,
                mimeType: 'text/plain',
              },
            ],
          };
        }
      }

      // If we don't recognize the URI pattern, return an error
      return {
        contents: [
          {
            uri: uri,
            text: `Error: Unrecognized resource URI: ${uri}`,
            mimeType: 'text/plain',
          },
        ],
      };
    } catch (error) {
      console.error('Error reading resource:', error);
      throw error;
    }
  });
};

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

/**
 * Format budget summary section
 */
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

  let markdown = `## Summary\n\n`;
  markdown += `| Metric | Amount |\n`;
  markdown += `|--------|--------|\n`;
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
  markdown += `\n`;
  return markdown;
}

/**
 * Format income category group
 */
function formatIncomeGroup(group: CategoryGroupData): string {
  let markdown = `### ${group.name}\n\n`;
  if (group.categories && group.categories.length > 0) {
    markdown += `| Category | Received |\n`;
    markdown += `|----------|----------|\n`;
    for (const category of group.categories) {
      const received = category.received || 0;
      markdown += `| ${category.name} | ${formatAmount(received)} |\n`;
    }
    markdown += `\n`;
  }
  return markdown;
}

/**
 * Format expense category group
 */
function formatExpenseGroup(group: CategoryGroupData): string {
  let markdown = `### ${group.name}\n\n`;
  markdown += `**Group Total**: Budgeted ${formatAmount(group.budgeted || 0)}, Spent ${formatAmount(Math.abs(group.spent || 0))}, Balance ${formatAmount(group.balance || 0)}\n\n`;

  if (group.categories && group.categories.length > 0) {
    markdown += `| Category | Budgeted | Spent | Balance |\n`;
    markdown += `|----------|----------|-------|----------|\n`;
    for (const category of group.categories) {
      const budgeted = category.budgeted || 0;
      const spent = Math.abs(category.spent || 0);
      const balance = category.balance || 0;
      const carryover = category.carryover ? ' ✓' : '';
      markdown += `| ${category.name} | ${formatAmount(budgeted)} | ${formatAmount(spent)} | ${formatAmount(balance)}${carryover} |\n`;
    }
    markdown += `\n`;
  }
  return markdown;
}

/**
 * Format category groups section
 */
function formatCategoryGroups(categoryGroups: BudgetMonthData['categoryGroups']): string {
  if (!categoryGroups || categoryGroups.length === 0) {
    return '';
  }

  let markdown = `## Category Groups\n\n`;
  for (const group of categoryGroups) {
    if (group.is_income) {
      markdown += formatIncomeGroup(group);
    } else {
      markdown += formatExpenseGroup(group);
    }
  }
  return markdown;
}

/**
 * Format budget month data as markdown
 */
function formatBudgetMonth(budgetData: BudgetMonthData, month: string): string {
  let markdown = `# Budget: ${month}\n\n`;
  markdown += formatBudgetSummary(budgetData);
  markdown += formatCategoryGroups(budgetData.categoryGroups);
  return markdown;
}
