import { getCategories, getCategoryGroups } from '../../core/api/actual-client.js';
import { GroupAggregator } from '../aggregation/group-by.js';
import { cacheService } from '../cache/cache-service.js';
import type { Category, CategoryGroup } from '../types/domain.js';

/**
 * Fetch all categories with caching support.
 * Results are cached for 5 minutes to improve performance.
 *
 * @returns Array of all categories
 */
export async function fetchAllCategories(): Promise<Category[]> {
  return getCategories();
}

/**
 * Fetch all categories as a map keyed by ID, with caching support.
 * Useful for lookups.
 *
 * @returns Record mapping category IDs to Category objects
 */
export async function fetchAllCategoriesMap(): Promise<Record<string, Category>> {
  return cacheService.getOrFetch('categories:map', async () => {
    const categories = await fetchAllCategories();
    return new GroupAggregator().byId(categories);
  });
}

/**
 * Fetch all category groups with caching support.
 * Results are cached for 5 minutes to improve performance.
 *
 * @returns Array of all category groups
 */
export async function fetchAllCategoryGroups(): Promise<CategoryGroup[]> {
  return getCategoryGroups();
}

/**
 * Fetch all category groups as a map keyed by ID, with caching support.
 * Useful for lookups.
 *
 * @returns Record mapping category group IDs to CategoryGroup objects
 */
export async function fetchAllCategoryGroupsMap(): Promise<Record<string, CategoryGroup>> {
  return cacheService.getOrFetch('categoryGroups:map', async () => {
    const groups = await fetchAllCategoryGroups();
    return new GroupAggregator().byId(groups);
  });
}
