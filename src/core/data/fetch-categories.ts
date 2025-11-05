import { getCategories, getCategoryGroups } from '../../actual-api.js';
import type { Category, CategoryGroup } from '../types/domain.js';
import { cacheService } from '../cache/cache-service.js';

// Cache TTL: 5 minutes (300 seconds)
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch all categories with caching support.
 * Results are cached for 5 minutes to improve performance.
 *
 * @returns Array of all categories
 */
export async function fetchAllCategories(): Promise<Category[]> {
  return cacheService.getOrFetch('categories:all', () => getCategories(), CACHE_TTL_MS);
}

/**
 * Fetch all category groups with caching support.
 * Results are cached for 5 minutes to improve performance.
 *
 * @returns Array of all category groups
 */
export async function fetchAllCategoryGroups(): Promise<CategoryGroup[]> {
  return cacheService.getOrFetch('categoryGroups:all', () => getCategoryGroups(), CACHE_TTL_MS);
}
