import type { Account } from '../types/domain.js';
import { nameResolver } from './name-resolver.js';

export interface ResolvedAccountSelection {
  accountId?: string;
  account?: Account;
}

/**
 * Resolve an account reference (name or ID) against a provided account list.
 * Returns both the resolved account ID and the matching account object when found.
 *
 * @param accounts - Cached list of accounts
 * @param reference - Account name or ID supplied by the caller
 * @returns Object containing the resolved account ID and matching account, if any
 */
export async function resolveAccountSelection(
  accounts: Account[],
  reference: string | undefined,
): Promise<ResolvedAccountSelection> {
  if (!reference) {
    return {};
  }

  const accountId = await nameResolver.resolveAccount(reference);
  const account = accounts.find((candidate) => candidate.id === accountId);

  return { accountId, account };
}
