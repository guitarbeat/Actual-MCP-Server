/**
 * Rule and tag operations for the Actual Budget API.
 */
import '../../../polyfill.js';
import api from '@actual-app/api';
import type { RuleEntity } from '../api-types.js';
import type { APITagEntity } from './types.js';
import { cacheService } from '../../cache/cache-service.js';
import { ensureConnection, runReadOperation } from './connection-guard.js';

// ── Reads ──────────────────────────────────────────────────────────────────────

/**
 * Get all rules (ensures API is initialized)
 */
export async function getRules(): Promise<RuleEntity[]> {
  return runReadOperation(() => api.getRules());
}

/**
 * Get all tags (ensures API is initialized)
 */
export async function getTags(): Promise<APITagEntity[]> {
  return runReadOperation(() => api.getTags(), { cacheKey: 'tags:all' });
}

// ── Writes ─────────────────────────────────────────────────────────────────────

/**
 * Create a new rule (ensures API is initialized)
 */
export async function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return ensureConnection(() => api.createRule(args as Omit<RuleEntity, 'id'>), 'write');
}

/**
 * Update a rule (ensures API is initialized)
 */
export async function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return ensureConnection(() => api.updateRule(args as unknown as RuleEntity), 'write');
}

/**
 * Delete a rule (ensures API is initialized)
 */
export async function deleteRule(id: string): Promise<boolean> {
  return ensureConnection(() => api.deleteRule(id), 'write');
}

/**
 * Create a new tag (ensures API is initialized)
 */
export async function createTag(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    if (!args.tag || typeof args.tag !== 'string') {
      throw new Error('Tag label is required');
    }

    const result = await api.createTag(args as Omit<APITagEntity, 'id'>);
    cacheService.invalidatePattern('tags:*');
    return result;
  }, 'write');
}

/**
 * Update a tag (ensures API is initialized)
 */
export async function updateTag(id: string, args: Record<string, unknown>): Promise<void> {
  return ensureConnection(async () => {
    await api.updateTag(id, args as Partial<Omit<APITagEntity, 'id'>>);
    cacheService.invalidatePattern('tags:*');
  }, 'write');
}

/**
 * Delete a tag (ensures API is initialized)
 */
export async function deleteTag(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteTag(id);
    cacheService.invalidatePattern('tags:*');
  }, 'write');
}
