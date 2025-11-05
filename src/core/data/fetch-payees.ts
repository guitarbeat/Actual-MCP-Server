import { getPayees } from '../../actual-api.js';
import type { Payee } from '../types/domain.js';
import { cacheService } from '../cache/cache-service.js';

// Cache TTL: 5 minutes (300 seconds)
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch all payees with caching support.
 * Results are cached for 5 minutes to improve performance.
 *
 * @returns Array of all payees
 */
export async function fetchAllPayees(): Promise<Payee[]> {
  return cacheService.getOrFetch('payees:all', () => getPayees(), CACHE_TTL_MS);
}
