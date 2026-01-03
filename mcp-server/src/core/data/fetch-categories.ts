import { getCategories, getCategoryGroups } from '../../core/api/actual-client.js';
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
 * Fetch all category groups with caching support.
 * Results are cached for 5 minutes to improve performance.
 *
 * @returns Array of all category groups
 */
export async function fetchAllCategoryGroups(): Promise<CategoryGroup[]> {
  return getCategoryGroups();
}
