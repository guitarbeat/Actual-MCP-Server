// ----------------------------
// CATEGORY ENTITY HANDLER
// ----------------------------

import { createCategory, deleteCategory, updateCategory } from '../../../core/api/actual-client.js';
import { cacheService } from '../../../core/cache/cache-service.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';
import type { CategoryData } from '../types.js';
import { CategoryDataSchema } from '../types.js';
import type { EntityHandler, Operation } from './base-handler.js';

/**
 * Handler for category entity operations
 * Implements create, update, and delete operations for categories
 */
export class CategoryHandler implements EntityHandler<CategoryData, CategoryData> {
  /**
   * Create a new category
   * @param data - Category creation data
   * @returns The ID of the created category
   */
  async create(data: CategoryData): Promise<string> {
    // Validate data
    const validated = CategoryDataSchema.parse(data);

    const { name, groupId } = validated;
    return createCategory({
      name,
      group_id: groupId,
    });
  }

  /**
   * Update an existing category
   * @param id - The category ID
   * @param data - Category update data
   */
  async update(id: string, data: CategoryData): Promise<void> {
    // Validate data
    const validated = CategoryDataSchema.parse(data);

    const { name, groupId } = validated;
    await updateCategory(id, {
      name,
      group_id: groupId,
    });
  }

  /**
   * Delete a category
   * @param id - The category ID
   */
  async delete(id: string): Promise<void> {
    await deleteCategory(id);
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
    cacheService.invalidate('categories:all');
    cacheService.invalidate('categoryGroups:all');
  }
}
