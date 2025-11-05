// Orchestrator for get-transactions tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GetTransactionsInputParser } from './input-parser.js';
import { GetTransactionsDataFetcher } from './data-fetcher.js';
import { TransactionMapper } from '../../core/mapping/transaction-mapper.js';
import { GetTransactionsReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../core/response/index.js';
import { getDateRange } from '../../utils.js';
import { GetTransactionsArgsSchema, type GetTransactionsArgs } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const schema = {
  name: 'get-transactions',
  description:
    'Retrieve transactions from Actual Budget with flexible filtering options. Supports date ranges, amount filters, and text-based filtering by category or payee name.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- accountId: Account name or ID (use get-accounts to find account IDs)\n\n' +
    'OPTIONAL FILTERS:\n' +
    '- startDate: Start date in YYYY-MM-DD format (defaults to 30 days ago if not specified)\n' +
    '- endDate: End date in YYYY-MM-DD format (defaults to today if not specified)\n' +
    '- minAmount: Minimum transaction amount in dollars (e.g., 50.00 for $50)\n' +
    '- maxAmount: Maximum transaction amount in dollars (e.g., 100.00 for $100)\n' +
    '- categoryName: Filter by category name (partial match, case-insensitive)\n' +
    '- payeeName: Filter by payee name (partial match, case-insensitive)\n' +
    '- limit: Maximum number of transactions to return\n\n' +
    'EXAMPLES:\n' +
    '- Recent transactions for an account:\n' +
    '  {"accountId": "Checking", "startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
    '- Large expenses over $100:\n' +
    '  {"accountId": "Credit Card", "minAmount": 100}\n' +
    '- Transactions from a specific merchant:\n' +
    '  {"accountId": "Checking", "payeeName": "Amazon"}\n' +
    '- Grocery spending in a date range:\n' +
    '  {"accountId": "Checking", "categoryName": "Groceries", "startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
    '- Combined filters (category + amount range + limit):\n' +
    '  {"accountId": "Checking", "categoryName": "Dining", "minAmount": 20, "maxAmount": 100, "limit": 10}\n' +
    '- All transactions from last 30 days (default):\n' +
    '  {"accountId": "Checking"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Reviewing recent spending: Specify accountId and date range to see transactions in a period\n' +
    '- Finding large transactions: Use minAmount filter to identify significant expenses or income\n' +
    '- Tracking specific merchant: Use payeeName filter to see all transactions with a particular vendor\n' +
    '- Category analysis: Use categoryName filter to analyze spending in a specific category\n' +
    '- Expense auditing: Combine multiple filters to narrow down specific transaction types\n\n' +
    'NOTES:\n' +
    '- Amounts in filters are in dollars (e.g., 50.00), but returned amounts are in cents\n' +
    '- Text filters (categoryName, payeeName) support partial matching for flexibility\n' +
    '- If no date range is specified, defaults to last 30 days\n' +
    '- Use get-accounts first if you need to find the correct account ID\n' +
    '- Filters are applied cumulatively (AND logic) - all specified filters must match\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-accounts to find the account ID or name\n' +
    '2. Use get-transactions to retrieve transactions with desired filters\n' +
    '3. Use manage-transaction to update or delete specific transactions if needed\n' +
    '4. Use spending-by-category or monthly-summary for deeper analysis\n\n' +
    'SEE ALSO:\n' +
    '- get-accounts: Find account IDs before querying transactions\n' +
    '- manage-transaction: Create, update, or delete transactions found by this tool\n' +
    '- spending-by-category: Analyze spending patterns from transactions\n' +
    '- monthly-summary: Get high-level financial summary including transaction data\n' +
    '- get-grouped-categories: Find category names for categoryName filter\n' +
    '- get-payees: Find payee names for payeeName filter',
  inputSchema: zodToJsonSchema(GetTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: GetTransactionsArgs): Promise<CallToolResult> {
  try {
    const input = new GetTransactionsInputParser().parse(args);
    const { accountId, startDate, endDate, minAmount, maxAmount, categoryName, payeeName, limit } = input;
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    // Fetch transactions
    const transactions = await new GetTransactionsDataFetcher().fetch(accountId, start, end);
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
    const filterDescription = [
      startDate || endDate ? `Date range: ${startDate} to ${endDate}` : null,
      minAmount !== undefined ? `Min amount: $${minAmount.toFixed(2)}` : null,
      maxAmount !== undefined ? `Max amount: $${maxAmount.toFixed(2)}` : null,
      categoryName ? `Category: ${categoryName}` : null,
      payeeName ? `Payee: ${payeeName}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const markdown = new GetTransactionsReportGenerator().generate(
      mapped,
      filterDescription,
      filtered.length,
      transactions.length
    );
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err, {
      tool: 'get-transactions',
      operation: 'fetch_and_filter_transactions',
      args,
    });
  }
}
