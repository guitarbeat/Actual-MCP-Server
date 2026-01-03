import { getPayees } from '../../core/api/actual-client.js';
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
