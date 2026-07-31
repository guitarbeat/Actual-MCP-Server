/**
 * Schedule operations for the Actual Budget API.
 */
import '../../../polyfill.js';
import api from '@actual-app/api';
import type { APIScheduleEntity, ExtendedActualApi } from './types.js';
import { ensureConnection, runReadOperation } from './connection-guard.js';

const extendedApi: ExtendedActualApi = api as ExtendedActualApi;

// ── Reads ──────────────────────────────────────────────────────────────────────

/**
 * Get all schedules (ensures API is initialized)
 */
export async function getSchedules(): Promise<APIScheduleEntity[]> {
  return runReadOperation(async () => {
    return (await extendedApi.getSchedules?.()) ?? [];
  });
}

// ── Writes ─────────────────────────────────────────────────────────────────────

/**
 * Create a new schedule (ensures API is initialized)
 */
export async function createSchedule(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    if (!extendedApi.createSchedule) {
      throw new Error('createSchedule method is not available in this version of the API');
    }
    return extendedApi.createSchedule(args);
  }, 'write');
}

/**
 * Update a schedule (ensures API is initialized)
 */
export async function updateSchedule(
  id: string,
  args: Record<string, unknown>,
  resetNextDate?: boolean,
): Promise<unknown> {
  return ensureConnection(async () => {
    if (!extendedApi.updateSchedule) {
      throw new Error('updateSchedule method is not available in this version of the API');
    }
    return extendedApi.updateSchedule(id, args, resetNextDate);
  }, 'write');
}

/**
 * Delete a schedule (ensures API is initialized)
 */
export async function deleteSchedule(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    if (!extendedApi.deleteSchedule) {
      throw new Error('deleteSchedule method is not available in this version of the API');
    }
    return extendedApi.deleteSchedule(id);
  }, 'write');
}
