// ----------------------------
// SCHEDULE ENTITY HANDLER
// ----------------------------

import { cacheService } from '../../../core/cache/cache-service.js';
import { createSchedule, deleteSchedule, updateSchedule } from '../../../actual-api.js';
import type { EntityHandler, Operation } from './base-handler.js';
import type { ScheduleData } from '../types.js';
import { ScheduleDataSchema } from '../types.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';

const API_UNAVAILABLE_ERROR_FRAGMENT = 'not available in this version of the API';

/**
 * Handler for schedule entity operations
 * Implements create, update, and delete operations for schedules
 */
export class ScheduleHandler implements EntityHandler<ScheduleData, ScheduleData> {
  /**
   * Create a new schedule
   * @param data - Schedule creation data
   * @returns The ID of the created schedule
   */
  async create(data: ScheduleData): Promise<string> {
    // Validate data
    const validated = ScheduleDataSchema.parse(data);

    // Ensure date field is present (required)
    if (!validated.date) {
      throw new Error('date field is required for schedule creation');
    }

    // Transform data for API: map accountId to account, remove invalid fields
    const apiData: Record<string, unknown> = {
      date: validated.date,
    };

    // Map accountId to account if provided
    if (validated.accountId) {
      apiData.account = validated.accountId;
    } else if (validated.account !== undefined) {
      apiData.account = validated.account;
    }

    // Add optional fields
    if (validated.name !== undefined) {
      apiData.name = validated.name;
    }
    if (validated.amount !== undefined) {
      apiData.amount = validated.amount;
    }
    if (validated.amountOp !== undefined) {
      apiData.amountOp = validated.amountOp;
    }
    if (validated.payee !== undefined) {
      apiData.payee = validated.payee;
    }
    if (validated.category !== undefined) {
      apiData.category = validated.category;
    }
    if (validated.notes !== undefined) {
      apiData.notes = validated.notes;
    }
    if (validated.posts_transaction !== undefined) {
      apiData.posts_transaction = validated.posts_transaction;
    }

    // Explicitly exclude fields that should not be sent
    // (rule, next_date, completed are auto-managed by API)

    try {
      const scheduleId = await createSchedule(apiData);
      return scheduleId;
    } catch (error) {
      this.handleScheduleApiError('create', error);
    }
  }

  /**
   * Update an existing schedule
   * @param id - The schedule ID
   * @param data - Schedule update data
   */
  async update(id: string, data: ScheduleData): Promise<void> {
    // Validate data
    const validated = ScheduleDataSchema.parse(data);

    // Transform data for API: map accountId to account, remove invalid fields
    const apiData: Record<string, unknown> = {};

    // Map accountId to account if provided
    if (validated.accountId !== undefined) {
      apiData.account = validated.accountId;
    } else if (validated.account !== undefined) {
      apiData.account = validated.account;
    }

    // Add optional fields (only include if provided)
    if (validated.name !== undefined) {
      apiData.name = validated.name;
    }
    if (validated.date !== undefined) {
      apiData.date = validated.date;
    }
    if (validated.amount !== undefined) {
      apiData.amount = validated.amount;
    }
    if (validated.amountOp !== undefined) {
      apiData.amountOp = validated.amountOp;
    }
    if (validated.payee !== undefined) {
      apiData.payee = validated.payee;
    }
    if (validated.category !== undefined) {
      apiData.category = validated.category;
    }
    if (validated.notes !== undefined) {
      apiData.notes = validated.notes;
    }
    if (validated.posts_transaction !== undefined) {
      apiData.posts_transaction = validated.posts_transaction;
    }

    // Explicitly exclude fields that should not be sent
    // (rule, next_date, completed are auto-managed by API)

    try {
      await updateSchedule(id, apiData);
    } catch (error) {
      this.handleScheduleApiError('update', error);
    }
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
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;

    if (message?.includes(API_UNAVAILABLE_ERROR_FRAGMENT)) {
      throw EntityErrorBuilder.unsupportedFeature('schedule', operation);
    }

    throw error;
  }
}
