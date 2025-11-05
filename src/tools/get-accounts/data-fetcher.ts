/**
 * Data fetcher for get-accounts tool
 * Handles fetching accounts and their balances
 */

import { getAccountBalance } from '@actual-app/api';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import type { Account } from '../../core/types/domain.js';

export interface AccountWithBalance extends Account {
  balance: number;
}

export class GetAccountsDataFetcher {
  /**
   * Fetch all accounts with their current balances
   *
   * @returns Array of accounts with balance information
   */
  async fetchAccounts(): Promise<AccountWithBalance[]> {
    const accounts: Account[] = await fetchAllAccounts();

    // Fetch balance for each account
    for (const account of accounts) {
      account.balance = await getAccountBalance(account.id);
    }

    return accounts as AccountWithBalance[];
  }
}
