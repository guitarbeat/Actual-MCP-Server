import { getTags } from '../../core/api/actual-client.js';
import { cacheService } from '../cache/cache-service.js';
import type { Tag } from '../types/domain.js';

/**
 * Fetch all tags with caching support.
 *
 * @returns Array of all tags
 */
export async function fetchAllTags(): Promise<Tag[]> {
  return cacheService.getOrFetch('tags:all', async () => getTags());
}
