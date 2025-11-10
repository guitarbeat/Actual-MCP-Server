// ----------------------------
// SCHEDULE ENTITY HANDLER
// ----------------------------

import { cacheService } from '../../../core/cache/cache-service.js';
import { createSchedule, deleteSchedule, updateSchedule } from '../../../actual-api.js';
import { nameResolver } from '../../../core/utils/name-resolver.js';
import type { EntityHandler, Operation } from './base-handler.js';
import type { ScheduleData, ScheduleUpdateData } from '../types.js';
import { ScheduleDataSchema, ScheduleUpdateDataSchema } from '../types.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';

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
    // Validate data
    const validated = ScheduleDataSchema.parse(data);

    // Ensure date field is present (required)
    if (!validated.date) {
      throw new Error('date field is required for schedule creation');
    }

    // Transform data for API: resolve names to IDs and convert amounts
    const apiData: Record<string, unknown> = {
      date: validated.date,
    };

    // Resolve account name to ID if provided
    if (validated.accountId) {
      apiData.account = await nameResolver.resolveAccount(validated.accountId);
    } else if (validated.account !== undefined && validated.account !== null) {
      apiData.account = await nameResolver.resolveAccount(validated.account);
    }

    // Add optional fields
    if (validated.name !== undefined) {
      apiData.name = validated.name;
    }

    // Convert amount to cents if it's a number
    if (validated.amount !== undefined) {
      if (typeof validated.amount === 'number') {
        apiData.amount = convertAmountToCents(validated.amount);
      } else {
        // For isbetween, convert both numbers
        apiData.amount = {
          num1: convertAmountToCents(validated.amount.num1),
          num2: convertAmountToCents(validated.amount.num2),
        };
      }
    }

    if (validated.amountOp !== undefined) {
      apiData.amountOp = validated.amountOp;
    }

    // Resolve payee name to ID if provided
    if (validated.payee !== undefined) {
      if (validated.payee) {
        apiData.payee = await nameResolver.resolvePayee(validated.payee);
      } else {
        apiData.payee = null;
      }
    }

    // Resolve category name to ID if provided
    if (validated.category !== undefined) {
      if (validated.category) {
        apiData.category = await nameResolver.resolveCategory(validated.category);
      } else {
        apiData.category = null;
      }
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
  async update(id: string, data: ScheduleUpdateData): Promise<void> {
    // Validate data allowing partial updates
    const validated = ScheduleUpdateDataSchema.parse(data);

    // Transform data for API: resolve names to IDs and convert amounts
    const apiData: Record<string, unknown> = {};

    // Resolve account name to ID if provided
    if (validated.accountId !== undefined) {
      apiData.account = await nameResolver.resolveAccount(validated.accountId);
    } else if (validated.account !== undefined) {
      if (validated.account !== null) {
        apiData.account = await nameResolver.resolveAccount(validated.account);
      } else {
        apiData.account = null;
      }
    }

    // Add optional fields (only include if provided)
    if (validated.name !== undefined) {
      apiData.name = validated.name;
    }
    if (validated.date !== undefined) {
      apiData.date = validated.date;
    }

    // Convert amount to cents if it's a number
    if (validated.amount !== undefined) {
      if (typeof validated.amount === 'number') {
        apiData.amount = convertAmountToCents(validated.amount);
      } else {
        // For isbetween, convert both numbers
        apiData.amount = {
          num1: convertAmountToCents(validated.amount.num1),
          num2: convertAmountToCents(validated.amount.num2),
        };
      }
    }

    if (validated.amountOp !== undefined) {
      apiData.amountOp = validated.amountOp;
    }

    // Resolve payee name to ID if provided
    if (validated.payee !== undefined) {
      if (validated.payee) {
        apiData.payee = await nameResolver.resolvePayee(validated.payee);
      } else {
        apiData.payee = null;
      }
    }

    // Resolve category name to ID if provided
    if (validated.category !== undefined) {
      if (validated.category) {
        apiData.category = await nameResolver.resolveCategory(validated.category);
      } else {
        apiData.category = null;
      }
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
