// ----------------------------
// CATEGORY GROUP ENTITY HANDLER
// ----------------------------

import { cacheService } from '../../../core/cache/cache-service.js';
import { createCategoryGroup, deleteCategoryGroup, updateCategoryGroup } from '../../../actual-api.js';
import type { EntityHandler, Operation } from './base-handler.js';
import type { CategoryGroupData } from '../types.js';
import { CategoryGroupDataSchema } from '../types.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';

/**
 * Handler for category group entity operations
 * Implements create, update, and delete operations for category groups
 */
export class CategoryGroupHandler implements EntityHandler<CategoryGroupData, CategoryGroupData> {
  /**
   * Create a new category group
   * @param data - Category group creation data
   * @returns The ID of the created category group
   */
  async create(data: CategoryGroupData): Promise<string> {
    // Validate data
    const validated = CategoryGroupDataSchema.parse(data);

    return createCategoryGroup(validated);
  }

  /**
   * Update an existing category group
   * @param id - The category group ID
   * @param data - Category group update data
   */
  async update(id: string, data: CategoryGroupData): Promise<void> {
    // Validate data
    const validated = CategoryGroupDataSchema.parse(data);

    await updateCategoryGroup(id, validated);
  }

  /**
   * Delete a category group
   * @param id - The category group ID
   */
  async delete(id: string): Promise<void> {
    await deleteCategoryGroup(id);
  }

  /**
   * Validate operation requirements
   * @param operation - The operation to validate
   * @param id - The entity ID (required for update/delete)
   * @param data - The entity data (required for create/update)
   */
  validate(operation: Operation, id?: string, data?: unknown): void {
    if (operation !== 'create' && !id) {
      throw EntityErrorBuilder.missingParameter(operation, 'id');
    }
    if (operation !== 'delete' && !data) {
      throw EntityErrorBuilder.missingParameter(operation, 'data');
    }
  }

  invalidateCache(): void {
    cacheService.invalidate('categoryGroups:all');
    cacheService.invalidate('categories:all');
  }
}
