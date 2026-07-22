/**
 * Account operations for the Actual Budget API.
 */
import '../../../polyfill.js';
import api from '@actual-app/api';
import type { APIAccountEntity } from './types.js';
import { cacheService } from '../../cache/cache-service.js';
import { invalidateNameResolutionState } from './cache-helpers.js';
import { ensureConnection } from './connection-guard.js';
import { runReadOperation } from './connection-guard.js';

// ── Reads ──────────────────────────────────────────────────────────────────────

/**
 * Get all accounts (ensures API is initialized)
 */
export async function getAccounts(): Promise<APIAccountEntity[]> {
  return runReadOperation(() => api.getAccounts(), { cacheKey: 'accounts:all' });
}

/**
 * Get account balance for a specific account and date (ensures API is initialized)
 */
export async function getAccountBalance(accountId: string, date?: string): Promise<number> {
  return runReadOperation(() => {
    // * Convert string date to Date object if provided
    const dateObj = date ? new Date(date) : undefined;
    return api.getAccountBalance(accountId, dateObj);
  });
}

// ── Writes ─────────────────────────────────────────────────────────────────────

/**
 * Create a new account (ensures API is initialized)
 */
export async function createAccount(args: Record<string, unknown>): Promise<string> {
  return createAccountWithInitialBalance(args);
}

/**
 * Create a new account with optional initial balance (ensures API is initialized)
 */
export async function createAccountWithInitialBalance(
  args: Record<string, unknown>,
  initialBalance?: number,
): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createAccount(args as Omit<APIAccountEntity, 'id'>, initialBalance);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update an account (ensures API is initialized)
 */
export async function updateAccount(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateAccount(id, args);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Close an account (ensures API is initialized)
 */
export async function closeAccount(
  id: string,
  transferAccountId?: string,
  transferCategoryId?: string,
): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.closeAccount(id, transferAccountId, transferCategoryId);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Reopen a closed account (ensures API is initialized)
 */
export async function reopenAccount(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.reopenAccount(id);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete an account (ensures API is initialized)
 */
export async function deleteAccount(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.deleteAccount(id);
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}
