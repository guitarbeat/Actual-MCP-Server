// Orchestrator for get-transactions tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GetTransactionsInputParser } from './input-parser.js';
import { GetTransactionsDataFetcher } from './data-fetcher.js';
import { TransactionMapper } from '../../core/mapping/transaction-mapper.js';
import { GetTransactionsReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../core/response/index.js';
import { getDateRange } from '../../utils.js';
import { GetTransactionsArgsSchema, type GetTransactionsArgs } from '../../core/types/index.js';
import { nameResolver } from '../../core/utils/name-resolver.js';
import type { ToolInput } from '../../types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const schema = {
  name: 'get-transactions',
  description:
    'Retrieve transactions from Actual Budget with flexible filtering options.\n\n' +
    'REQUIRED:\n' +
    '- accountId: Account name or ID (supports partial matching, e.g., "Chase" matches "Chase Checking")\n\n' +
    'OPTIONAL FILTERS:\n' +
    '- startDate/endDate: Date range in YYYY-MM-DD format (defaults to last 3 months if omitted)\n' +
    '- minAmount/maxAmount: Amount range in dollars (negative for expenses, positive for income)\n' +
    '- categoryName/payeeName: Text filter with partial, case-insensitive matching\n' +
    '- limit: Maximum number of results to return\n\n' +
    'EXAMPLES:\n' +
    '- Recent transactions: {"accountId": "Checking", "startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
    '- Large expenses: {"accountId": "Credit Card", "minAmount": 100}\n' +
    '- By payee: {"accountId": "Checking", "payeeName": "Amazon"}\n' +
    '- By category: {"accountId": "Checking", "categoryName": "Groceries"}\n' +
    '- Last 10 transactions: {"accountId": "Checking", "limit": 10}\n' +
    '- Income only: {"accountId": "Checking", "minAmount": 0.01}\n' +
    '- Expenses over $50: {"accountId": "Checking", "maxAmount": -50}\n\n' +
    'COMMON USE CASES:\n' +
    '- View recent transactions for an account\n' +
    '- Find specific transactions by payee or category name\n' +
    '- Filter transactions by amount range\n' +
    '- Get transaction details for reconciliation\n' +
    '- Search for transactions matching specific criteria\n' +
    '- Find large purchases or income deposits\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account names/IDs before filtering transactions\n' +
    '- Use spending-by-category for spending analysis by category groups\n' +
    '- Use monthly-summary for high-level monthly financial overview\n\n' +
    'NOTES:\n' +
    '- Filter amounts in dollars, returned amounts in cents\n' +
    '- Defaults to last 3 months if no date range specified\n' +
    '- Account names support partial matching (case-insensitive)\n' +
    '- Category and payee filters use partial, case-insensitive matching',
  inputSchema: zodToJsonSchema(GetTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: GetTransactionsArgs): Promise<CallToolResult> {
  try {
    const input = new GetTransactionsInputParser().parse(args);
    const { accountId, startDate, endDate, minAmount, maxAmount, categoryName, payeeName, limit } = input;
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    const resolvedAccountId = await nameResolver.resolveAccount(accountId);

    // Fetch transactions
    const transactions = await new GetTransactionsDataFetcher().fetch(resolvedAccountId, start, end, {
      accountIdIsResolved: true,
    });
    let filtered = [...transactions];

    if (minAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount >= minAmount * 100);
    }
    if (maxAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount <= maxAmount * 100);
    }
    if (categoryName) {
      const lowerCategory = categoryName.toLowerCase();
      filtered = filtered.filter((t) => (t.category_name || '').toLowerCase().includes(lowerCategory));
    }
    if (payeeName) {
      const lowerPayee = payeeName.toLowerCase();
      filtered = filtered.filter((t) => (t.payee_name || '').toLowerCase().includes(lowerPayee));
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

    const markdown = new GetTransactionsReportGenerator().generate(mapped, {
      accountReference: accountId,
      resolvedAccountId,
      dateRange: { start, end },
      appliedFilters,
      filteredCount: filtered.length,
      totalFetched: transactions.length,
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
