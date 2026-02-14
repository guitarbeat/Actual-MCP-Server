// Fetches transactions and related data for get-transactions tool
import { fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Transaction } from '../../core/types/domain.js';

interface FetchOptions {
  accountIdIsResolved?: boolean;
}

export class GetTransactionsDataFetcher {
  async fetch(
    accountId: string,
    start: string,
    end: string,
    options: FetchOptions = {},
  ): Promise<Transaction[]> {
    return fetchTransactionsForAccount(accountId, start, end, options);
  }
}
