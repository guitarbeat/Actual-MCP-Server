// ----------------------------
// RESOURCES
// ----------------------------

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  type ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import {
  getAccountBalance,
  getAccounts,
  getBudgetMonth,
  getBudgetMonths,
  getTransactions,
  initActualApi,
} from './core/api/actual-client.js';
import { formatAmount, formatDate, getDateRange } from './core/formatting/index.js';
// Import types from core/types
import type { Account, Transaction } from './core/types/index.js';

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

/**
 * Handle listing all accounts
 */
async function handleAccountsResource(uri: string): Promise<ReadResourceResult> {
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
        uri,
        text: `# Actual Budget Accounts\n\n${accountsText}\n\nTotal Accounts: ${accounts.length}`,
        mimeType: 'text/markdown',
      },
    ],
  };
}

/**
 * Handle individual account details
 */
async function handleAccountDetailsResource(
  uri: string,
  accountId: string,
): Promise<ReadResourceResult> {
  const accounts: Account[] = await getAccounts();
  const account: Account | undefined = accounts.find((a) => a.id === accountId);

  if (!account) {
    return {
      contents: [
        {
          uri,
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
        uri,
        text: details,
        mimeType: 'text/markdown',
      },
    ],
  };
}

/**
 * Handle account transactions
 */
async function handleAccountTransactionsResource(
  uri: string,
  accountId: string,
): Promise<ReadResourceResult> {
  const { startDate, endDate } = getDateRange();
  const transactions: Transaction[] = await getTransactions(accountId, startDate, endDate);

  if (!transactions || transactions.length === 0) {
    return {
      contents: [
        {
          uri,
          text: `No transactions found for account ID ${accountId} between ${startDate} and ${endDate}`,
          mimeType: 'text/plain',
        },
      ],
    };
  }

  const header =
    '| Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- |\n';
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
        uri,
        text,
        mimeType: 'text/markdown',
      },
    ],
  };
}

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
          description:
            'Browse all accounts. Use the get-accounts tool for detailed account information and balances.',
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
      return await handleResourceRequest(request.params.uri);
    } catch (error) {
      console.error('Error reading resource:', error);
      throw error;
    }
  });
};

/**
 * Route resource request based on URI
 */
async function handleResourceRequest(uri: string): Promise<ReadResourceResult> {
  const url = new URL(uri);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (url.hostname === 'accounts') {
    return routeAccountsResource(uri, pathParts);
  }

  if (url.hostname === 'budgets') {
    return routeBudgetsResource(uri, pathParts);
  }

  return {
    contents: [{ uri, text: `Error: Unrecognized resource URI: ${uri}`, mimeType: 'text/plain' }],
  };
}

/**
 * Route actual://accounts requests
 */
async function routeAccountsResource(
  uri: string,
  pathParts: string[],
): Promise<ReadResourceResult> {
  if (pathParts.length === 0) return handleAccountsResource(uri);
  if (pathParts.length === 1) return handleAccountDetailsResource(uri, pathParts[0]);
  if (pathParts.length === 2 && pathParts[1] === 'transactions') {
    return handleAccountTransactionsResource(uri, pathParts[0]);
  }
  return {
    contents: [
      { uri, text: `Error: Unrecognized account resource: ${uri}`, mimeType: 'text/plain' },
    ],
  };
}

/**
 * Route actual://budgets requests
 */
async function routeBudgetsResource(uri: string, pathParts: string[]): Promise<ReadResourceResult> {
  if (pathParts.length === 0) {
    const allMonths = await getBudgetMonths();
    const months = filterRelevantBudgetMonths(allMonths);
    return {
      contents: [
        {
          uri,
          text: `# Actual Budget Months\n\nShowing relevant months (3 months back, current month, 2 months forward):\n\n${months.map((m) => `- ${m}`).join('\n')}\n\nTotal Months: ${months.length}`,
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
      const budgetData = await getBudgetMonth(month);
      return {
        contents: [
          {
            uri,
            text: formatBudgetMonth(budgetData as BudgetMonthData, month),
            mimeType: 'text/markdown',
          },
        ],
      };
    } catch (_e) {
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
