/**
 * Data fetcher for get-accounts tool
 * Handles fetching accounts and their balances with optional filtering
 */

import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAccountBalances } from '../../core/data/fetch-account-balances.js';
import type { Account } from '../../core/types/domain.js';
import { nameResolver } from '../../core/utils/name-resolver.js';
import { isId, normalizeName } from '../../core/utils/name-utils.js';
import { formatAccountDataWarnings } from '../../core/utils/partial-results.js';

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface FetchAccountsOptions {
  accountId?: string;
  includeClosed: boolean;
}

export interface FetchAccountsResult {
  accounts: AccountWithBalance[];
  partial: boolean;
  warnings: string[];
}

export async function fetchAccounts(options: FetchAccountsOptions): Promise<FetchAccountsResult> {
  let accounts: Account[] = await fetchAllAccounts();

  if (options.accountId) {
    accounts = isId(options.accountId)
      ? await resolveAccountsById(accounts, options.accountId)
      : await resolveAccountsByName(accounts, options.accountId);
  }

  if (!options.includeClosed) {
    accounts = accounts.filter((account) => !account.closed);
  }

  const { balancesByAccountId, warnings } = await fetchAccountBalances(accounts);
  const hydratedAccounts = accounts
    .filter((account) => account.id in balancesByAccountId)
    .map((account) => ({
      ...account,
      balance: balancesByAccountId[account.id],
    })) as AccountWithBalance[];

  return {
    accounts: hydratedAccounts,
    partial: warnings.length > 0,
    warnings: formatAccountDataWarnings(warnings),
  };
}

async function resolveAccountsById(accounts: Account[], accountId: string): Promise<Account[]> {
  try {
    const resolvedId = await nameResolver.resolveAccount(accountId);
    return accounts.filter((account) => account.id === resolvedId);
  } catch {
    return [];
  }
}

async function resolveAccountsByName(accounts: Account[], accountId: string): Promise<Account[]> {
  const normalizedInput = normalizeName(accountId);
  let matchedAccounts = accounts.filter(
    (account) => normalizeName(account.name) === normalizedInput,
  );

  if (matchedAccounts.length === 0) {
    matchedAccounts = accounts.filter((account) =>
      normalizeName(account.name).includes(normalizedInput),
    );
  }

  if (matchedAccounts.length === 0) {
    const availableAccounts = (await fetchAllAccounts()).map((account) => account.name).join(', ');
    throw new Error(
      `Account '${accountId}' not found. Available accounts: ${availableAccounts || 'none'}`,
    );
  }

  return matchedAccounts;
}
