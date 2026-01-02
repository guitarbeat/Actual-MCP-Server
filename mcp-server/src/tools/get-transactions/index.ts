// Orchestrator for get-transactions tool
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TransactionMapper } from '../../core/mapping/transaction-mapper.js';
import { errorFromCatch, success } from '../../core/response/index.js';
import type { Transaction } from '../../core/types/domain.js';
import { type GetTransactionsArgs, GetTransactionsArgsSchema } from '../../core/types/index.js';
import { nameResolver } from '../../core/utils/name-resolver.js';
import type { ToolInput } from '../../core/types/index.js';
import { getDateRange } from '../../core/formatting/index.js';
import { GetTransactionsDataFetcher } from './data-fetcher.js';
import { GetTransactionsInputParser } from './input-parser.js';
import { GetTransactionsReportGenerator } from './report-generator.js';

export const schema = {
  name: 'get-transactions',
  description:
    'Query and filter transaction history from a specific account or across all accounts. Returns enriched transaction data including ID, date, amount, payee, and category.',
  inputSchema: zodToJsonSchema(GetTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: GetTransactionsArgs): Promise<CallToolResult> {
  try {
    const input = new GetTransactionsInputParser().parse(args);
    const { accountId, startDate, endDate, minAmount, maxAmount, categoryName, payeeName, limit, excludeTransfers } =
      input;
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    let resolvedAccountId: string;
    let transactions: Transaction[];

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

    const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

    const markdown = new GetTransactionsReportGenerator().generate(mapped, {
      accountReference: accountId,
      resolvedAccountId,
      dateRange: { start, end },
      appliedFilters,
      filteredCount: filtered.length,
      totalFetched: transactions.length,
      totalAmount: filtered.reduce((sum, t) => sum + t.amount, 0),
      accountSummary,
      totalAmount,
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
