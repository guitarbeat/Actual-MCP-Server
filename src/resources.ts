// ----------------------------
// RESOURCES
// ----------------------------

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
// Import types from core/types
import type { Account, Transaction } from './core/types/index.js';
import { formatAmount, formatDate, getDateRange } from './utils.js';
import {
  getBudgetMonths,
  getBudgetMonth,
  getAccounts,
  getAccountBalance,
  getTransactions,
  initActualApi,
} from './actual-api.js';

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
   * Note: initActualApi() is called at server startup, so we don't need to call it here.
   * The API connection is persistent and will be automatically reconnected if needed.
   */
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // * API is already initialized at server startup, no need to re-initialize
    // * If connection is lost, ensureConnection wrapper in actual-api.ts will handle reconnection
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
   * Note: initActualApi() is called at server startup, so we don't need to call it here.
   * The API connection is persistent and will be automatically reconnected if needed.
   */
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri: string = request.params?.uri || 'unknown';

    try {
      // * Ensure API is initialized before reading resources
      // * This handles cases where the server hasn't fully initialized yet
      try {
        await initActualApi();
      } catch (initError) {
        // * Extract detailed error information
        let errorMessage = 'Unknown error';
        let errorDetails = '';

        if (initError instanceof Error) {
          errorMessage = initError.message || 'Unknown error';
          errorDetails = initError.stack ? `\n\nStack trace:\n${initError.stack}` : '';
        } else if (typeof initError === 'string') {
          errorMessage = initError;
        } else if (initError !== null && initError !== undefined) {
          // * Try to extract additional error information from error object
          const errorObj = initError as Record<string, unknown>;
          if (errorObj.message) {
            errorMessage = String(errorObj.message);
          } else if (errorObj.error) {
            errorMessage = String(errorObj.error);
          } else if (errorObj.code) {
            errorMessage = `Error code: ${errorObj.code}`;
          } else if (errorObj.status) {
            errorMessage = `HTTP status: ${errorObj.status}`;
          } else if (errorObj.response) {
            errorMessage = `API response error: ${JSON.stringify(errorObj.response)}`;
          } else {
            try {
              errorMessage = JSON.stringify(initError);
            } catch {
              errorMessage = String(initError);
            }
          }

          // * Extract stack trace if available
          if (errorObj.stack) {
            errorDetails = `\n\nStack trace:\n${String(errorObj.stack)}`;
          }
        }

        // * Provide helpful context about what might be wrong
        // * Check stack trace for downloadBudget to provide specific guidance
        const stackTrace = errorDetails.toLowerCase();
        const isDownloadBudgetError = stackTrace.includes('download-budget') || stackTrace.includes('downloadBudget');

        let suggestion = '';
        if (isDownloadBudgetError) {
          suggestion =
            '\n\nSuggestion: The error occurred while downloading the budget. This could be due to:\n' +
            '  - Invalid or missing ACTUAL_BUDGET_SYNC_ID\n' +
            '  - Budget requires a password (set ACTUAL_BUDGET_PASSWORD)\n' +
            '  - Incorrect budget password\n' +
            '  - Budget does not exist or is not accessible\n' +
            '  - Network/connection issues with the Actual Budget server';
        } else if (
          errorMessage.toLowerCase().includes('connection') ||
          errorMessage.toLowerCase().includes('econnrefused')
        ) {
          suggestion =
            '\n\nSuggestion: Check that ACTUAL_SERVER_URL is correct and the Actual Budget server is running.';
        } else if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('auth')) {
          suggestion = '\n\nSuggestion: Verify ACTUAL_PASSWORD is correct.';
        } else if (errorMessage.toLowerCase().includes('budget')) {
          suggestion = '\n\nSuggestion: Ensure you have at least one budget created in Actual Budget.';
        } else {
          suggestion = '\n\nSuggestion: Check server logs for more details.';
        }

        return {
          contents: [
            {
              uri: uri,
              text: `Error: Failed to initialize Actual Budget API.\n\n${errorMessage}${suggestion}${errorDetails}`,
              mimeType: 'text/plain',
            },
          ],
        };
      }

      // Parse URI - handle invalid URI format gracefully
      let url: URL;
      try {
        url = new URL(uri);
      } catch (_urlError) {
        return {
          contents: [
            {
              uri: uri,
              text: `Error: Invalid resource URI format: ${uri}. Expected format: actual://accounts or actual://budgets`,
              mimeType: 'text/plain',
            },
          ],
        };
      }

      // Parse the path to determine what to return
      const pathParts: string[] = url.pathname.split('/').filter(Boolean);

      // If the path is just "accounts", return list of all accounts
      if (pathParts.length === 0 && url.hostname === 'accounts') {
        try {
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            contents: [
              {
                uri: uri,
                text: `Error: Failed to retrieve accounts. ${errorMessage}`,
                mimeType: 'text/plain',
              },
            ],
          };
        }
      }

      // If the path is "accounts/{id}", return account details
      if (pathParts.length === 1 && url.hostname === 'accounts') {
        try {
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            contents: [
              {
                uri: uri,
                text: `Error: Failed to retrieve account details. ${errorMessage}`,
                mimeType: 'text/plain',
              },
            ],
          };
        }
      }

      // If the path is "accounts/{id}/transactions", return transactions
      if (pathParts.length === 2 && pathParts[1] === 'transactions' && url.hostname === 'accounts') {
        try {
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            contents: [
              {
                uri: uri,
                text: `Error: Failed to retrieve transactions. ${errorMessage}`,
                mimeType: 'text/plain',
              },
            ],
          };
        }
      }

      // If the path is just "budgets", return list of relevant budget months
      if (pathParts.length === 0 && url.hostname === 'budgets') {
        try {
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            contents: [
              {
                uri: uri,
                text: `Error: Failed to retrieve budget months. ${errorMessage}`,
                mimeType: 'text/plain',
              },
            ],
          };
        }
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
          const formattedBudget = formatBudgetMonth(budgetData, month);

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
      // * Return error as content instead of throwing to avoid MCP -32603 Internal error
      // * This ensures errors are properly formatted and returned to the client
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Error reading resource:', error);
      if (errorStack && process.env.NODE_ENV !== 'production') {
        console.error('Stack trace:', errorStack);
      }

      return {
        contents: [
          {
            uri: uri,
            text: `Error: Failed to read resource '${uri}'. ${errorMessage}`,
            mimeType: 'text/plain',
          },
        ],
      };
    }
  });
};

/**
 * Format budget month data as markdown
 */
function formatBudgetMonth(budgetData: any, month: string): string {
  const {
    totalIncome = 0,
    totalBudgeted = 0,
    totalSpent = 0,
    totalBalance = 0,
    toBudget = 0,
    fromLastMonth = 0,
    lastMonthOverspent = 0,
    forNextMonth = 0,
    categoryGroups = [],
  } = budgetData;

  let markdown = `# Budget: ${month}\n\n`;

  // Summary section
  markdown += `## Summary\n\n`;
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

  // Category groups section
  if (categoryGroups && categoryGroups.length > 0) {
    markdown += `## Category Groups\n\n`;

    for (const group of categoryGroups) {
      if (group.is_income) {
        // Income categories
        markdown += `### ${group.name}\n\n`;
        if (group.categories && group.categories.length > 0) {
          markdown += `| Category | Received |\n`;
          markdown += `|----------|----------|\n`;
          for (const category of group.categories) {
            const received = category.received || 0;
            markdown += `| ${category.name} | ${formatAmount(received)} |\n`;
          }
          markdown += `\n`;
        }
      } else {
        // Expense categories
        markdown += `### ${group.name}\n\n`;
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
      }
    }
  }

  return markdown;
}
