// Orchestrator for get-transactions tool
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TransactionMapper } from '../../core/mapping/transaction-mapper.js';
import { errorFromCatch, success } from '../../core/response/index.js';
import { type GetTransactionsArgs, GetTransactionsArgsSchema } from '../../core/types/index.js';
import { nameResolver } from '../../core/utils/name-resolver.js';
import type { ToolInput } from '../../types.js';
import { getDateRange } from '../../utils.js';
import { GetTransactionsDataFetcher } from './data-fetcher.js';
import { GetTransactionsInputParser } from './input-parser.js';
import { GetTransactionsReportGenerator } from './report-generator.js';

export const schema = {
  name: 'get-transactions',
  description:
    'Query and filter transaction history from a specific account or across all accounts. Use this when the user asks to see, find, list, or show transactions.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "show me transactions from my checking account"\n' +
    '- User wants to find specific purchases or payments\n' +
    '- User asks about spending at a specific merchant (use payeeName filter)\n' +
    '- User wants to see recent activity in an account\n' +
    '- User asks about transactions in a category (use categoryName filter)\n' +
    '- User wants to find large expenses or income deposits (use minAmount/maxAmount)\n' +
    '- User asks "show all uncategorized transactions" (use accountId: "all", categoryName: "Uncategorized", excludeTransfers: true)\n\n' +
    'REQUIRED:\n' +
    '- accountId: Account name (e.g., "Checking"), partial match (e.g., "Chase" matches "Chase Checking"), or "all" to search across all accounts\n\n' +
    'OPTIONAL FILTERS:\n' +
    '- startDate/endDate: YYYY-MM-DD format (defaults to last 3 months)\n' +
    '- minAmount/maxAmount: Dollar amounts (negative = expenses, positive = income)\n' +
    '- categoryName: Partial category name (e.g., "groc" matches "Groceries")\n' +
    '- payeeName: Partial merchant name (e.g., "amazon" matches "Amazon.com")\n' +
    '- limit: Max results to return\n\n' +
    'EXAMPLES:\n' +
    '- "Show recent checking transactions": {"accountId": "Checking"}\n' +
    '- "Find Amazon purchases": {"accountId": "Credit Card", "payeeName": "Amazon"}\n' +
    '- "Show grocery spending": {"accountId": "Checking", "categoryName": "Groceries"}\n' +
    '- "Find expenses over $100": {"accountId": "Checking", "maxAmount": -100}\n' +
    '- "Last 10 transactions": {"accountId": "Checking", "limit": 10}\n' +
    '- "Show all uncategorized transactions": {"accountId": "all", "categoryName": "Uncategorized", "excludeTransfers": true}',
  inputSchema: zodToJsonSchema(GetTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: GetTransactionsArgs): Promise<CallToolResult> {
  try {
    const input = new GetTransactionsInputParser().parse(args);
    const { accountId, startDate, endDate, minAmount, maxAmount, categoryName, payeeName, limit, excludeTransfers } =
      input;
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    let resolvedAccountId: string;
    let transactions: any[];

    // Handle "all" accounts
    if (accountId.toLowerCase() === 'all') {
      const { fetchAllAccounts } = await import('../../core/data/fetch-accounts.js');
      const accounts = await fetchAllAccounts();
      const onBudgetAccounts = accounts.filter((acc) => !acc.offbudget && !acc.closed);

      // Fetch transactions from all on-budget accounts
      const allTransactions = await Promise.all(
        onBudgetAccounts.map((acc) =>
          new GetTransactionsDataFetcher().fetch(acc.id, start, end, {
            accountIdIsResolved: true,
          })
        )
      );
      transactions = allTransactions.flat();
      resolvedAccountId = 'all';
    } else {
      resolvedAccountId = await nameResolver.resolveAccount(accountId);
      // Fetch transactions
      transactions = await new GetTransactionsDataFetcher().fetch(resolvedAccountId, start, end, {
        accountIdIsResolved: true,
      });
    }

    let filtered = [...transactions];

    if (minAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount >= minAmount * 100);
    }
    if (maxAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount <= maxAmount * 100);
    }
    if (categoryName) {
      const lowerCategory = categoryName.toLowerCase();
      if (lowerCategory === 'uncategorized') {
        // Special case: filter for null/empty categories
        filtered = filtered.filter((t) => !t.category || t.category === null);
      } else {
        filtered = filtered.filter((t) => (t.category_name || '').toLowerCase().includes(lowerCategory));
      }
    }
    if (payeeName) {
      const lowerPayee = payeeName.toLowerCase();
      filtered = filtered.filter((t) => (t.payee_name || '').toLowerCase().includes(lowerPayee));
    }
    if (excludeTransfers) {
      filtered = filtered.filter((t) => !t.is_parent && !t.is_child && t.transfer_id == null);
    }
    if (limit && filtered.length > limit) {
      filtered = filtered.slice(0, limit);
    }

    // Map transactions for output
    const mapped = new TransactionMapper().map(filtered);

    // Build filter description
    const appliedFilters: string[] = [];
    if (minAmount !== undefined) {
      appliedFilters.push(`Minimum amount: $${minAmount.toFixed(2)}`);
    }
    if (maxAmount !== undefined) {
      appliedFilters.push(`Maximum amount: $${maxAmount.toFixed(2)}`);
    }
    if (categoryName) {
      appliedFilters.push(`Category contains: "${categoryName}"`);
    }
    if (payeeName) {
      appliedFilters.push(`Payee contains: "${payeeName}"`);
    }
    if (limit !== undefined) {
      appliedFilters.push(`Result limit: ${limit}`);
    }

    // Generate account summary if searching all accounts
    let accountSummary: { accountName: string; count: number }[] | undefined;
    if (accountId.toLowerCase() === 'all') {
      const accountCounts = new Map<string, number>();
      filtered.forEach((t) => {
        const name = t.account_name || t.account || 'Unknown';
        accountCounts.set(name, (accountCounts.get(name) || 0) + 1);
      });
      accountSummary = Array.from(accountCounts.entries())
        .map(([accountName, count]) => ({ accountName, count }))
        .sort((a, b) => b.count - a.count);
    }

    const markdown = new GetTransactionsReportGenerator().generate(mapped, {
      accountReference: accountId,
      resolvedAccountId,
      dateRange: { start, end },
      appliedFilters,
      filteredCount: filtered.length,
      totalFetched: transactions.length,
      accountSummary,
    });
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err, {
      tool: 'get-transactions',
      operation: 'fetch_and_filter_transactions',
      args,
    });
  }
}
