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
    'Query and filter transaction history from a specific account. Use this when the user asks to see, find, list, or show transactions.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "show me transactions from my checking account"\n' +
    '- User wants to find specific purchases or payments\n' +
    '- User asks about spending at a specific merchant (use payeeName filter)\n' +
    '- User wants to see recent activity in an account\n' +
    '- User asks about transactions in a category (use categoryName filter)\n' +
    '- User wants to find large expenses or income deposits (use minAmount/maxAmount)\n\n' +
    'REQUIRED:\n' +
    '- accountId: Account name (e.g., "Checking") or partial match (e.g., "Chase" matches "Chase Checking")\n\n' +
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
    '- "Last 10 transactions": {"accountId": "Checking", "limit": 10}',
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
