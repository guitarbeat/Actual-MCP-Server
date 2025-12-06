// ----------------------------
// PAYEE ENTITY HANDLER
// ----------------------------

import { createPayee, deletePayee, updatePayee } from '../../../actual-api.js';
import { cacheService } from '../../../core/cache/cache-service.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';
import type { PayeeData } from '../types.js';
import { PayeeDataSchema } from '../types.js';
import type { EntityHandler, Operation } from './base-handler.js';

/**
 * Handler for payee entity operations
 * Implements create, update, and delete operations for payees
 */
export class PayeeHandler implements EntityHandler<PayeeData, PayeeData> {
  /**
   * Create a new payee
   * @param data - Payee creation data
   * @returns The ID of the created payee
   */
  async create(data: PayeeData): Promise<string> {
    // Validate data
    const validated = PayeeDataSchema.parse(data);

    return createPayee(validated);
  }

  /**
   * Update an existing payee
   * @param id - The payee ID
   * @param data - Payee update data
   */
  async update(id: string, data: PayeeData): Promise<void> {
    // Validate data
    const validated = PayeeDataSchema.parse(data);

    await updatePayee(id, validated);
  }

  /**
   * Delete a payee
   * @param id - The payee ID
   */
  async delete(id: string): Promise<void> {
    await deletePayee(id);
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
    cacheService.invalidate('payees:all');
  }
}
