// ----------------------------
// RULE ENTITY HANDLER
// ----------------------------

import { createRule, deleteRule, updateRule } from '../../../core/api/actual-client.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';
import type { RuleData } from '../types.js';
import { RuleDataSchema } from '../types.js';
import type { EntityHandler, Operation } from './base-handler.js';

/**
 * Handler for rule entity operations
 * Implements create, update, and delete operations for rules
 */
export class RuleHandler implements EntityHandler<RuleData, RuleData> {
  /**
   * Create a new rule
   * @param data - Rule creation data
   * @returns The ID of the created rule
   */
  async create(data: RuleData): Promise<string> {
    // Validate data
    const validated = RuleDataSchema.parse(data);

    const rule = await createRule(validated);
    return rule.id;
  }

  /**
   * Update an existing rule
   * @param id - The rule ID
   * @param data - Rule update data
   */
  async update(id: string, data: RuleData): Promise<void> {
    // Update operations support partial rule patches.
    const validated = RuleDataSchema.partial().parse(data);

    await updateRule({ id, ...validated });
  }

  /**
   * Delete a rule
   * @param id - The rule ID
   */
  async delete(id: string): Promise<void> {
    await deleteRule(id);
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
    // Rules are not cached, but we implement this for consistency
  }
}
