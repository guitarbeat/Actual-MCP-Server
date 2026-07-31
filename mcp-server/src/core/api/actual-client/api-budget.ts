/**
 * Budget operations for the Actual Budget API.
 */
import '../../../polyfill.js';
import api from '@actual-app/api';
import type { BudgetFile } from '../../types/index.js';
import { invalidateAllReadState } from './cache-helpers.js';
import { loadBudgetByResolvedIdentifier } from './budget-resolution.js';
import { ensureConnection, runReadOperation } from './connection-guard.js';
import { markConnectionReady, markSyncSuccess } from './connection-state.js';

// ── Reads ──────────────────────────────────────────────────────────────────────

/**
 * Get all budget months (ensures API is initialized)
 */
export async function getBudgetMonths(): Promise<string[]> {
  return runReadOperation(() => api.getBudgetMonths());
}

/**
 * Get budget data for a specific month (ensures API is initialized)
 */
export async function getBudgetMonth(month: string): Promise<unknown> {
  return runReadOperation(() => api.getBudgetMonth(month));
}

/**
 * Get all budgets (ensures API is initialized)
 */
export async function getBudgets(): Promise<BudgetFile[]> {
  return runReadOperation(() => api.getBudgets());
}

// ── Writes ─────────────────────────────────────────────────────────────────────

/**
 * Set budget amount for a category in a specific month (ensures API is initialized)
 */
export async function setBudgetAmount(
  month: string,
  categoryId: string,
  amount: number,
): Promise<unknown> {
  const opStart = Date.now();
  return ensureConnection(async () => {
    const result = await api.setBudgetAmount(month, categoryId, amount);
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error(`[PERF] setBudgetAmount completed in ${Date.now() - opStart}ms`);
    }
    return result;
  }, 'write');
}

/**
 * Set budget carryover for a category in a specific month (ensures API is initialized)
 */
export async function setBudgetCarryover(
  month: string,
  categoryId: string,
  flag: boolean,
): Promise<unknown> {
  const opStart = Date.now();
  return ensureConnection(async () => {
    const result = await api.setBudgetCarryover(month, categoryId, flag);
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error(`[PERF] setBudgetCarryover completed in ${Date.now() - opStart}ms`);
    }
    return result;
  }, 'write');
}

/**
 * Hold budget amount for next month (ensures API is initialized)
 */
export async function holdBudgetForNextMonth(month: string, amount: number): Promise<unknown> {
  return ensureConnection(() => api.holdBudgetForNextMonth(month, amount), 'write');
}

/**
 * Reset budget hold for a specific month (ensures API is initialized)
 */
export async function resetBudgetHold(month: string): Promise<unknown> {
  return ensureConnection(() => api.resetBudgetHold(month), 'write');
}

/**
 * Batch budget updates (ensures API is initialized)
 */
export async function batchBudgetUpdates(callback: () => Promise<void>): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.batchBudgetUpdates === 'function') {
      const result = await api.batchBudgetUpdates(callback);
      invalidateAllReadState();
      return result;
    }
    throw new Error('batchBudgetUpdates method is not available in this version of the API');
  }, 'write');
}

/**
 * Download a budget (ensures API is initialized)
 * @param budgetId - The budget sync ID
 * @param password - Optional password for end-to-end encrypted budgets
 */
export async function downloadBudget(budgetId: string, password?: string): Promise<void> {
  return ensureConnection(async () => {
    if (password) {
      await api.downloadBudget(budgetId, { password });
    } else {
      await api.downloadBudget(budgetId);
    }

    const activeBudgetId = await loadBudgetByResolvedIdentifier(api, budgetId);
    markConnectionReady(activeBudgetId);
    markSyncSuccess();
    invalidateAllReadState();
  }, 'write');
}

/**
 * Load a budget (ensures API is initialized)
 * Note: This may be the same as downloadBudget in some API versions
 */
export async function loadBudget(budgetId: string): Promise<void> {
  return ensureConnection(async () => {
    if (typeof api.loadBudget === 'function') {
      await api.loadBudget(budgetId);
    } else {
      // Fallback to downloadBudget if loadBudget doesn't exist
      await api.downloadBudget(budgetId);
    }
    markConnectionReady(budgetId);
    markSyncSuccess();
    invalidateAllReadState();
  }, 'write');
}
