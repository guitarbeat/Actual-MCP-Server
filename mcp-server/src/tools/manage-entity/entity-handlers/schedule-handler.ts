// ----------------------------
// SCHEDULE ENTITY HANDLER
// ----------------------------

import { createSchedule, deleteSchedule, updateSchedule } from '../../../core/api/actual-client.js';
import { cacheService } from '../../../core/cache/cache-service.js';
import { nameResolver } from '../../../core/utils/name-resolver.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';
import type { ScheduleData, ScheduleUpdateData } from '../types.js';
import { ScheduleDataSchema, ScheduleUpdateDataSchema } from '../types.js';
import type { EntityHandler, Operation } from './base-handler.js';

const API_UNAVAILABLE_ERROR_FRAGMENT = 'not available in this version of the API';

/**
 * Converts amount to cents if it appears to be in dollars.
 * Smart detection: amounts < 1000 are treated as dollars (multiply by 100).
 * Amounts >= 1000 are assumed to already be in cents.
 * Examples: -50 → -5000, -50.00 → -5000, -50.5 → -5050, -5000 → -5000
 */
function convertAmountToCents(amount: number): number {
  const absAmount = Math.abs(amount);

  // If amount is >= 1000, assume it's already in cents
  if (absAmount >= 1000) {
    return Math.round(amount);
  }

  // For amounts < 1000, treat as dollars (multiply by 100)
  // This handles both whole numbers (e.g., -30 → -3000) and decimals (e.g., -30.50 → -3050)
  return Math.round(amount * 100);
}

/**
 * Handler for schedule entity operations
 * Implements create, update, and delete operations for schedules
 */
export class ScheduleHandler implements EntityHandler<ScheduleData, ScheduleUpdateData> {
  /**
   * Create a new schedule
   * @param data - Schedule creation data
   * @returns The ID of the created schedule
   */
  async create(data: ScheduleData): Promise<string> {
    const validated = ScheduleDataSchema.parse(data);
    if (!validated.date) throw new Error('date field is required for schedule creation');

    const apiData: Record<string, unknown> = { date: validated.date };
    await this.applyScheduleTransformations(apiData, validated);

    try {
      return await createSchedule(apiData);
    } catch (error) {
      this.handleScheduleApiError('create', error);
    }
  }

  async update(id: string, data: ScheduleUpdateData): Promise<void> {
    const validated = ScheduleUpdateDataSchema.parse(data);
    const apiData: Record<string, unknown> = {};
    await this.applyScheduleTransformations(apiData, validated);

    try {
      await updateSchedule(id, apiData);
    } catch (error) {
      this.handleScheduleApiError('update', error);
    }
  }

  private async applyScheduleTransformations(
    apiData: Record<string, unknown>,
    validated: ScheduleData | ScheduleUpdateData,
  ): Promise<void> {
    await this.resolveScheduleAccounts(apiData, validated);
    if (validated.name !== undefined) apiData.name = validated.name;
    if (validated.date !== undefined) apiData.date = validated.date;

    if (validated.amount !== undefined) {
      apiData.amount = this.transformScheduleAmount(validated.amount);
    }

    if (validated.amountOp !== undefined) apiData.amountOp = validated.amountOp;

    if (validated.payee !== undefined) {
      apiData.payee = validated.payee ? await nameResolver.resolvePayee(validated.payee) : null;
    }

    if (validated.category !== undefined) {
      apiData.category = validated.category
        ? await nameResolver.resolveCategory(validated.category)
        : null;
    }

    if (validated.notes !== undefined) apiData.notes = validated.notes;
    if (validated.posts_transaction !== undefined)
      apiData.posts_transaction = validated.posts_transaction;
  }

  private async resolveScheduleAccounts(
    apiData: Record<string, unknown>,
    validated: ScheduleData | ScheduleUpdateData,
  ): Promise<void> {
    if ('accountId' in validated && validated.accountId) {
      apiData.account = await nameResolver.resolveAccount(validated.accountId);
    } else if (validated.account !== undefined && validated.account !== null) {
      apiData.account = await nameResolver.resolveAccount(validated.account);
    }
  }

  private transformScheduleAmount(amount: number | { num1: number; num2: number }): unknown {
    if (typeof amount === 'number') {
      return convertAmountToCents(amount);
    }
    return {
      num1: convertAmountToCents(amount.num1),
      num2: convertAmountToCents(amount.num2),
    };
  }

  /**
   * Delete a schedule
   * @param id - The schedule ID
   */
  async delete(id: string): Promise<void> {
    try {
      await deleteSchedule(id);
    } catch (error) {
      this.handleScheduleApiError('delete', error);
    }
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
    cacheService.invalidate('schedules:all');
  }

  private handleScheduleApiError(operation: Operation, error: unknown): never {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;

    if (message?.includes(API_UNAVAILABLE_ERROR_FRAGMENT)) {
      throw EntityErrorBuilder.unsupportedFeature('schedule', operation);
    }

    throw error;
  }
}
