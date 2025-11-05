/**
 * Data fetcher for get-accounts tool
 * Handles fetching accounts and their balances with optional filtering
 */

import { getAccountBalance } from '@actual-app/api';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { nameResolver } from '../../core/utils/name-resolver.js';
import type { Account } from '../../core/types/domain.js';

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface FetchAccountsOptions {
  accountId?: string;
  includeClosed: boolean;
}

export class GetAccountsDataFetcher {
  /**
   * Fetch accounts with their current balances, optionally filtered
   *
   * @param options - Filtering options
   * @returns Array of accounts with balance information
   */
  async fetchAccounts(options: FetchAccountsOptions): Promise<AccountWithBalance[]> {
    let accounts: Account[] = await fetchAllAccounts();

    // Filter by account ID if specified (supports both ID and name)
    if (options.accountId) {
      const resolvedId = await nameResolver.resolveAccount(options.accountId);
      accounts = accounts.filter((a) => a.id === resolvedId);
    }

    // Filter closed accounts unless explicitly included
    if (!options.includeClosed) {
      accounts = accounts.filter((a) => !a.closed);
    }

    // Fetch balance for each account
    for (const account of accounts) {
      account.balance = await getAccountBalance(account.id);
    }

    return accounts as AccountWithBalance[];
  }
}
