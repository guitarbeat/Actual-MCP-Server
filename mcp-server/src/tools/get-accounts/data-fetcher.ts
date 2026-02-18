/**
 * Data fetcher for get-accounts tool
 * Handles fetching accounts and their balances with optional filtering
 */

import { getAccountBalance } from '../../core/api/actual-client.js';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import type { Account } from '../../core/types/domain.js';
import { nameResolver } from '../../core/utils/name-resolver.js';

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface FetchAccountsOptions {
  accountId?: string;
  includeClosed: boolean;
}

/**
 * Check if a string looks like a UUID/ID
 *
 * @param value - String to check
 * @returns True if the value appears to be an ID
 */
function isId(value: string): boolean {
  return value.includes('-') || (value.length > 20 && /^[a-zA-Z0-9]+$/.test(value));
}

/**
 * Normalize a name for comparison by removing emojis and trimming whitespace.
 * This allows matching "Chase Checking" with "🏦 Chase Checking".
 *
 * @param name - Name to normalize
 * @returns Normalized name (lowercase, emojis removed, trimmed)
 */
function normalizeName(name: string): string {
  // Remove emojis using Unicode ranges
  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}]|[\u{FE0F}]/gu;
  return name.replace(emojiRegex, '').trim().toLowerCase();
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

    if (options.accountId) {
      if (isId(options.accountId)) {
        accounts = await this.resolveAccountsById(accounts, options.accountId);
      } else {
        accounts = await this.resolveAccountsByName(accounts, options.accountId);
      }
    }

    // Filter closed accounts unless explicitly included
    if (!options.includeClosed) {
      accounts = accounts.filter((a) => !a.closed);
    }

    // Fetch balance for each account in parallel
    // Optimization: Use Promise.all to fetch balances concurrently instead of sequentially
    await Promise.all(
      accounts.map(async (account) => {
        account.balance = await getAccountBalance(account.id);
      }),
    );

    return accounts as AccountWithBalance[];
  }

  private async resolveAccountsById(accounts: Account[], accountId: string): Promise<Account[]> {
    try {
      const resolvedId = await nameResolver.resolveAccount(accountId);
      return accounts.filter((a) => a.id === resolvedId);
    } catch {
      return [];
    }
  }

  private async resolveAccountsByName(accounts: Account[], accountId: string): Promise<Account[]> {
    const normalizedInput = normalizeName(accountId);
    let matchedAccounts = accounts.filter((a) => normalizeName(a.name) === normalizedInput);

    if (matchedAccounts.length === 0) {
      matchedAccounts = accounts.filter((a) => normalizeName(a.name).includes(normalizedInput));
    }

    if (matchedAccounts.length === 0) {
      const availableAccounts = (await fetchAllAccounts()).map((a: Account) => a.name).join(', ');
      throw new Error(
        `Account '${accountId}' not found. Available accounts: ${availableAccounts || 'none'}`,
      );
    }

    return matchedAccounts;
  }
}
