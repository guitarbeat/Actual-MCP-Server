// Orchestrator for get-transactions tool
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { fetchAllOnBudgetTransactionsWithMetadata } from '../../core/data/fetch-transactions.js';
import { getDateRange } from '../../core/formatting/index.js';
import { TransactionMapper } from '../../core/mapping/transaction-mapper.js';
import {
  errorFromCatch,
  success,
  successWithJson as _successWithJson,
} from '../../core/response/index.js';
import type { Transaction } from '../../core/types/domain.js';
import { GetTransactionsArgsSchema } from '../../core/types/index.js';
import type { ToolInput, GetTransactionsArgs } from '../../core/types/index.js';
import { formatAccountDataWarnings } from '../../core/utils/partial-results.js';
import { nameResolver } from '../../core/utils/name-resolver.js';
import { GetTransactionsDataFetcher } from './data-fetcher.js';
import { GetTransactionsInputParser } from './input-parser.js';
import { resolveGetTransactionsPagination } from './pagination.js';
import { GetTransactionsReportGenerator } from './report-generator.js';
import {
  filterTransactions,
  buildAppliedFilters,
  sortTransactionsNewestFirst,
  generateAccountSummary,
} from './transaction-utils.js';

export const schema = {
  name: 'get-transactions',
  description:
    'Query and filter transaction history from a specific account or across all accounts. Returns enriched transaction data including ID, date, amount, payee, and category. Results are sorted newest-first; use limit/offset for pagination (defaults apply when limit is omitted—see report footer for hasMore and next_offset).',
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
      offset,
      excludeTransfers,
    } = input;
    const pagination = resolveGetTransactionsPagination({ limit, offset });
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    let resolvedAccountId: string;
    let transactions: Transaction[];
    let warnings: string[] = [];

    // Fetch transactions
    if (accountId.toLowerCase() === 'all') {
      const { fetchAllAccounts } = await import('../../core/data/fetch-accounts.js');
      const accounts = await fetchAllAccounts();
      const result = await fetchAllOnBudgetTransactionsWithMetadata(accounts, start, end);
      transactions = result.transactions;
      warnings = formatAccountDataWarnings(result.warnings);
      resolvedAccountId = 'all';
    } else {
      resolvedAccountId = await nameResolver.resolveAccount(accountId);
      transactions = await new GetTransactionsDataFetcher().fetch(resolvedAccountId, start, end, {
        accountIdIsResolved: true,
      });
    }

    const afterFilters = filterTransactions(transactions, {
      minAmount,
      maxAmount,
      categoryName,
      payeeName,
      excludeTransfers,
    });

    const sorted = sortTransactionsNewestFirst(afterFilters);
    const windowed = sorted.slice(pagination.offset, pagination.offset + pagination.limit);
    const hasMore = pagination.offset + windowed.length < sorted.length;

    const mapped = new TransactionMapper().map(windowed);
    const appliedFilters = buildAppliedFilters({
      minAmount,
      maxAmount,
      categoryName,
      payeeName,
    });

    // Generate summary if needed
    const accountSummary =
      accountId.toLowerCase() === 'all' ? generateAccountSummary(sorted) : undefined;
    const totalAmount = windowed.reduce((sum, t) => sum + t.amount, 0);

    const markdown = new GetTransactionsReportGenerator().generate(mapped, {
      accountReference: accountId,
      resolvedAccountId,
      dateRange: { start, end },
      appliedFilters,
      filteredCount: windowed.length,
      totalFetched: transactions.length,
      totalMatchingFilters: sorted.length,
      totalAmount,
      accountSummary,
      warnings,
      pagination: {
        offset: pagination.offset,
        limit: pagination.limit,
        hasMore,
        nextOffset: hasMore ? pagination.offset + pagination.limit : undefined,
        cappedToMax: pagination.cappedToMax,
        defaultedLimit: pagination.defaultedLimit,
      },
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
