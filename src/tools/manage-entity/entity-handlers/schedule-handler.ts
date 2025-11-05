// ----------------------------
// SCHEDULE ENTITY HANDLER
// ----------------------------

import { cacheService } from '../../../core/cache/cache-service.js';
import { createSchedule, deleteSchedule, updateSchedule } from '../../../actual-api.js';
import type { EntityHandler, Operation } from './base-handler.js';
import type { ScheduleData } from '../types.js';
import { ScheduleDataSchema } from '../types.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';

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

    const scheduleId = await createSchedule(validated);
    return scheduleId;
  }

  /**
   * Update an existing schedule
   * @param id - The schedule ID
   * @param data - Schedule update data
   */
  async update(id: string, data: ScheduleData): Promise<void> {
    // Validate data
    const validated = ScheduleDataSchema.parse(data);

    await updateSchedule(id, validated);
  }

  /**
   * Delete a schedule
   * @param id - The schedule ID
   */
  async delete(id: string): Promise<void> {
    await deleteSchedule(id);
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
    // Schedules are not cached, but we implement this for consistency
  }
}
