/**
 * Payee operations for the Actual Budget API.
 */
import '../../../polyfill.js';
import api from '@actual-app/api';
import type { RuleEntity } from '../api-types.js';
import type { APIPayeeEntity } from './types.js';
import { cacheService } from '../../cache/cache-service.js';
import { invalidateNameResolutionState } from './cache-helpers.js';
import { ensureConnection, runReadOperation } from './connection-guard.js';

// ── Reads ──────────────────────────────────────────────────────────────────────

/**
 * Get all payees (ensures API is initialized)
 */
export async function getPayees(): Promise<APIPayeeEntity[]> {
  return runReadOperation(() => api.getPayees(), { cacheKey: 'payees:all' });
}

/**
 * Get rules for a specific payee (ensures API is initialized)
 */
export async function getPayeeRules(payeeId: string): Promise<RuleEntity[]> {
  return runReadOperation(() => api.getPayeeRules(payeeId));
}

// ── Writes ─────────────────────────────────────────────────────────────────────

/**
 * Create a new payee (ensures API is initialized)
 */
export async function createPayee(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    // * Ensure name is provided as required by the API
    if (!args.name || typeof args.name !== 'string') {
      throw new Error('Payee name is required');
    }
    const result = await api.createPayee(args as Omit<APIPayeeEntity, 'id'>);
    cacheService.invalidatePattern('payees:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update a payee (ensures API is initialized)
 */
export async function updatePayee(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updatePayee(id, args);
    cacheService.invalidatePattern('payees:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete a payee (ensures API is initialized)
 */
export async function deletePayee(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.deletePayee(id);
    cacheService.invalidatePattern('payees:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Merge multiple payees into a target payee (ensures API is initialized)
 */
export async function mergePayees(targetId: string, sourceIds: string[]): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.mergePayees(targetId, sourceIds);
    cacheService.invalidatePattern('payees:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}
