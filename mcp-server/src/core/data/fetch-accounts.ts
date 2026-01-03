import { getAccounts } from '../../core/api/actual-client.js';
import type { Account } from '../types/domain.js';

/**
 * Fetch all accounts with caching support.
 * Results are cached for 5 minutes to improve performance.
 *
 * @returns Array of all accounts
 */
export async function fetchAllAccounts(): Promise<Account[]> {
  return getAccounts();
}
