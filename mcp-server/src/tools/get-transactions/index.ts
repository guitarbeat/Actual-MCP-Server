// Orchestrator for get-transactions tool
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getDateRange } from '../../core/formatting/index.js';
import { TransactionMapper } from '../../core/mapping/transaction-mapper.js';
import { errorFromCatch, success } from '../../core/response/index.js';
import type { Transaction } from '../../core/types/domain.js';
import type {
  ToolInput,
  type GetTransactionsArgs,
  GetTransactionsArgsSchema,
} from '../../core/types/index.js';
import { nameResolver } from '../../core/utils/name-resolver.js';
import { GetTransactionsDataFetcher } from './data-fetcher.js';
import { GetTransactionsInputParser } from './input-parser.js';
import { GetTransactionsReportGenerator } from './report-generator.js';

/**
 * Filter transactions based on provided criteria
 */
function filterTransactions(
  transactions: Transaction[],
  criteria: {
    minAmount?: number;
    maxAmount?: number;
    categoryName?: string;
    payeeName?: string;
    excludeTransfers?: boolean;
    limit?: number;
  },
): Transaction[] {
  let filtered = [...transactions];
  const { minAmount, maxAmount, categoryName, payeeName, excludeTransfers, limit } = criteria;

  if (minAmount !== undefined) {
    filtered = filtered.filter((t) => t.amount >= minAmount * 100);
  }
  if (maxAmount !== undefined) {
    filtered = filtered.filter((t) => t.amount <= maxAmount * 100);
  }
  if (categoryName) {
    const lowerCategory = categoryName.toLowerCase();
    if (lowerCategory === 'uncategorized') {
      filtered = filtered.filter((t) => !t.category || t.category === null);
    } else {
      filtered = filtered.filter((t) =>
        (t.category_name || '').toLowerCase().includes(lowerCategory),
      );
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
  return filtered;
}

/**
 * Build descriptive list of applied filters
 */
function buildAppliedFilters(criteria: {
  minAmount?: number;
  maxAmount?: number;
  categoryName?: string;
  payeeName?: string;
  limit?: number;
}): string[] {
  const filters: string[] = [];
  const { minAmount, maxAmount, categoryName, payeeName, limit } = criteria;

  if (minAmount !== undefined) filters.push(`Minimum amount: $${minAmount.toFixed(2)}`);
  if (maxAmount !== undefined) filters.push(`Maximum amount: $${maxAmount.toFixed(2)}`);
  if (categoryName) filters.push(`Category contains: "${categoryName}"`);
  if (payeeName) filters.push(`Payee contains: "${payeeName}"`);
  if (limit !== undefined) filters.push(`Result limit: ${limit}`);

  return filters;
}

/**
 * Generate account summary for "all" search
 */
function generateAccountSummary(filtered: Transaction[]): { accountName: string; count: number }[] {
  const accountCounts = new Map<string, number>();
  filtered.forEach((t) => {
    const name = t.account_name || t.account || 'Unknown';
    accountCounts.set(name, (accountCounts.get(name) || 0) + 1);
  });
  return Array.from(accountCounts.entries())
    .map(([accountName, count]) => ({ accountName, count }))
    .sort((a, b) => b.count - a.count);
}

export const schema = {
  name: 'get-transactions',
  description:
    'Query and filter transaction history from a specific account or across all accounts. Returns enriched transaction data including ID, date, amount, payee, and category.',
  inputSchema: zodToJsonSchema(GetTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: GetTransactionsArgs): Promise<CallToolResult> {
  try {
    const input = new GetTransactionsInputParser().parse(args);
    const {
      accountId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      categoryName,
      payeeName,
      limit,
      excludeTransfers,
    } = input;
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    let resolvedAccountId: string;
    let transactions: Transaction[];

    // Fetch transactions
    if (accountId.toLowerCase() === 'all') {
      const { fetchAllAccounts } = await import('../../core/data/fetch-accounts.js');
      const accounts = await fetchAllAccounts();
      const onBudgetAccounts = accounts.filter((acc) => !acc.offbudget && !acc.closed);

      const allTransactions = await Promise.all(
        onBudgetAccounts.map((acc) =>
          new GetTransactionsDataFetcher().fetch(acc.id, start, end, {
            accountIdIsResolved: true,
          }),
        ),
      );
      transactions = allTransactions.flat();
      resolvedAccountId = 'all';
    } else {
      resolvedAccountId = await nameResolver.resolveAccount(accountId);
      transactions = await new GetTransactionsDataFetcher().fetch(resolvedAccountId, start, end, {
        accountIdIsResolved: true,
      });
    }

    // Apply filtering
    const filtered = filterTransactions(transactions, {
      minAmount,
      maxAmount,
      categoryName,
      payeeName,
      excludeTransfers,
      limit,
    });

    const mapped = new TransactionMapper().map(filtered);
    const appliedFilters = buildAppliedFilters({
      minAmount,
      maxAmount,
      categoryName,
      payeeName,
      limit,
    });

    // Generate summary if needed
    const accountSummary =
      accountId.toLowerCase() === 'all' ? generateAccountSummary(filtered) : undefined;
    const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

    const markdown = new GetTransactionsReportGenerator().generate(mapped, {
      accountReference: accountId,
      resolvedAccountId,
      dateRange: { start, end },
      appliedFilters,
      filteredCount: filtered.length,
      totalFetched: transactions.length,
      totalAmount,
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
