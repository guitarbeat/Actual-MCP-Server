/**
 * Data fetcher for get-accounts tool
 * Handles fetching accounts and their balances with optional filtering
 */

import { getAccountBalance } from '../../actual-api.js';
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

    // Filter by account ID if specified (supports both ID and name with partial matching)
    if (options.accountId) {
      // If it looks like an ID, try exact match first
      if (isId(options.accountId)) {
        try {
          const resolvedId = await nameResolver.resolveAccount(options.accountId);
          accounts = accounts.filter((a) => a.id === resolvedId);
        } catch {
          // If exact match fails for ID-like string, return empty (invalid ID)
          accounts = [];
        }
      } else {
        // For name-like strings, try exact match first, then partial match
        const normalizedInput = normalizeName(options.accountId);
        let matchedAccounts = accounts.filter((a) => normalizeName(a.name) === normalizedInput);

        // If no exact match, try partial matching
        if (matchedAccounts.length === 0) {
          matchedAccounts = accounts.filter((a) => normalizeName(a.name).includes(normalizedInput));
        }

        accounts = matchedAccounts;

        // If still no matches, throw error with helpful message
        if (accounts.length === 0) {
          const availableAccounts = (await fetchAllAccounts()).map((a: Account) => a.name).join(', ');
          throw new Error(
            `Account '${options.accountId}' not found. Available accounts: ${availableAccounts || 'none'}`
          );
        }
      }
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
