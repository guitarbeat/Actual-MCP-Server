import { getPayees } from '../../core/api/actual-client.js';
import { GroupAggregator } from '../aggregation/group-by.js';
import { cacheService } from '../cache/cache-service.js';
import type { Payee } from '../types/domain.js';

/**
 * Fetch all payees with caching support.
 * Results are cached for 5 minutes to improve performance.
 *
 * @returns Array of all payees
 */
export async function fetchAllPayees(): Promise<Payee[]> {
  return getPayees();
}

/**
 * Fetch all payees as a map keyed by ID, with caching support.
 * Useful for lookups.
 *
 * @returns Record mapping payee IDs to Payee objects
 */
export async function fetchAllPayeesMap(): Promise<Record<string, Payee>> {
  return cacheService.getOrFetch('payees:map', async () => {
    const payees = await fetchAllPayees();
    return new GroupAggregator().byId(payees);
  });
}
