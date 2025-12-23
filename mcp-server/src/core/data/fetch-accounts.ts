import { getAccounts } from '../../core/api/actual-client.js';
import { cacheService } from '../cache/cache-service.js';
import type { Account } from '../types/domain.js';

// Cache TTL: 5 minutes (300 seconds)
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch all accounts with caching support.
 * Results are cached for 5 minutes to improve performance.
 *
 * @returns Array of all accounts
 */
export async function fetchAllAccounts(): Promise<Account[]> {
  return cacheService.getOrFetch('accounts:all', () => getAccounts(), CACHE_TTL_MS);
}
