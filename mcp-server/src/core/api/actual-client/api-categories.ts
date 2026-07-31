/**
 * Category operations for the Actual Budget API.
 */
import '../../../polyfill.js';
import api from '@actual-app/api';
import type { APICategoryEntity, APICategoryGroupEntity } from './types.js';
import { cacheService } from '../../cache/cache-service.js';
import { invalidateNameResolutionState } from './cache-helpers.js';
import { ensureConnection, runReadOperation } from './connection-guard.js';

// ── Reads ──────────────────────────────────────────────────────────────────────

/**
 * Get all categories (ensures API is initialized)
 */
export async function getCategories(): Promise<APICategoryEntity[]> {
  return runReadOperation(
    async () => {
      const result = await api.getCategories();
      // * Filter out category groups if API returns a union type
      return result.filter((item): item is APICategoryEntity => 'group_id' in item);
    },
    { cacheKey: 'categories:all' },
  );
}

/**
 * Get all category groups (ensures API is initialized)
 */
export async function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  return runReadOperation(() => api.getCategoryGroups(), { cacheKey: 'categoryGroups:all' });
}

// ── Writes ─────────────────────────────────────────────────────────────────────

/**
 * Create a new category (ensures API is initialized)
 */
export async function createCategory(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createCategory(args as Omit<APICategoryEntity, 'id'>);
    cacheService.invalidatePattern('categories:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update a category (ensures API is initialized)
 */
export async function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateCategory(id, args);
    cacheService.invalidatePattern('categories:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete a category (ensures API is initialized)
 */
export async function deleteCategory(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteCategory(id);
    cacheService.invalidatePattern('categories:*');
    invalidateNameResolutionState();
  }, 'write');
}

/**
 * Create a new category group (ensures API is initialized)
 */
export async function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createCategoryGroup(args as Omit<APICategoryGroupEntity, 'id'>);
    cacheService.invalidatePattern('categoryGroups:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update a category group (ensures API is initialized)
 */
export async function updateCategoryGroup(
  id: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateCategoryGroup(id, args);
    cacheService.invalidatePattern('categoryGroups:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete a category group (ensures API is initialized)
 */
export async function deleteCategoryGroup(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteCategoryGroup(id);
    cacheService.invalidatePattern('categoryGroups:*');
    invalidateNameResolutionState();
  }, 'write');
}
