import api from '@actual-app/api';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { BudgetFile } from './core/types/index.js';
import {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
} from '@actual-app/api/@types/loot-core/src/server/api-models.js';
import { RuleEntity, TransactionEntity } from '@actual-app/api/@types/loot-core/src/types/models/index.js';
import type { ImportTransactionsOpts } from '@actual-app/api/@types/methods.js';
import { cacheService } from './core/cache/cache-service.js';

type ExtendedActualApi = typeof api & {
  createSchedule?: (args: Record<string, unknown>) => Promise<string>;
  updateSchedule?: (id: string, args: Record<string, unknown>) => Promise<unknown>;
  deleteSchedule?: (id: string) => Promise<unknown>;
  getSchedules?: () => Promise<unknown[]>;
  runBankSync?: (options?: { accountId: string }) => Promise<unknown>;
  getServerVersion?: () => Promise<{ error?: string } | { version: string }>;
  getIDByName?: (args: { type: string; string: string }) => Promise<string>;
};

const extendedApi: ExtendedActualApi = api as ExtendedActualApi;

const DEFAULT_DATA_DIR: string = path.resolve(os.homedir() || '.', '.actual');

// API initialization state
let initialized = false;
let initializing = false;
let initializationError: Error | null = null;
let checkingHealth = false; // Prevent recursion in health checks

// Performance tracking for initialization
let initializationTime: number | null = null;
let initializationSkipCount = 0;

// Auto-sync state
let autoSyncInterval: NodeJS.Timeout | null = null;

/**
 * Check if the Actual Budget API connection is healthy
 * @returns true if connection is healthy, false otherwise
 */
async function checkConnectionHealth(): Promise<boolean> {
  if (!initialized) {
    return false;
  }

  // Prevent recursion - if we're already checking health, skip
  if (checkingHealth) {
    return true; // Assume healthy to avoid recursion
  }

  checkingHealth = true;
  try {
    // Use a lightweight API call to verify connection
    // Call raw API directly to avoid recursion with ensureConnection wrapper
    await api.getAccounts();
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStr = errorMessage.toLowerCase();

    // Check for connection-related errors
    if (
      errorStr.includes('not connected') ||
      errorStr.includes('connection') ||
      errorStr.includes('econnrefused') ||
      errorStr.includes('network') ||
      errorStr.includes('timeout')
    ) {
      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        console.error('[CONNECTION] Health check failed - connection lost');
      }
      return false;
    }

    // Other errors might be valid (e.g., no accounts), so assume connection is OK
    return true;
  } finally {
    checkingHealth = false;
  }
}

/**
 * Initialize the Actual Budget API
 * @param forceReconnect - If true, force reconnection even if already initialized
 */
export async function initActualApi(forceReconnect = false): Promise<void> {
  if (initialized && !forceReconnect) {
    // Log when initialization is skipped due to existing connection
    initializationSkipCount++;
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      const timeSaved = initializationTime || 600; // Use actual time or estimate
      console.error(
        `[PERF] ⚡ Initialization skipped (persistent connection) - saved ~${timeSaved}ms (skip count: ${initializationSkipCount})`
      );
    }
    return;
  }

  // If forcing reconnect, reset initialization state
  if (forceReconnect && initialized) {
    initialized = false;
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error('[CONNECTION] Forcing reconnection...');
    }
  }
  if (initializing) {
    // Wait for initialization to complete if already in progress
    while (initializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (initializationError) throw initializationError;
    return;
  }

  initializing = true;
  const startTime = Date.now();

  initializationError = null;
  try {
    const dataDir = process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    // * Removed JSON log to stdout - this was being interpreted as JSON-RPC in stdio mode
    // * Configuration details are logged via MCP logging if needed
    await api.init({
      dataDir,
      serverURL: process.env.ACTUAL_SERVER_URL,
      password: process.env.ACTUAL_PASSWORD,
    });

    const budgets: BudgetFile[] = await api.getBudgets();
    if (!budgets || budgets.length === 0) {
      throw new Error('No budgets found. Please create a budget in Actual first.');
    }

    // * Log available budgets for debugging
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error(`[INIT] Found ${budgets.length} budget(s):`);
      budgets.forEach((b, i) => {
        console.error(`  ${i + 1}. Name: "${b.name}", ID: ${b.id}, Sync ID: ${b.cloudFileId || 'N/A'}`);
      });
    }

    // Use specified budget or the first one
    const requestedSyncId = process.env.ACTUAL_BUDGET_SYNC_ID;
    let budgetId = '';
    let selectedBudget: BudgetFile | undefined;

    if (requestedSyncId) {
      // * Try to find budget by sync ID (cloudFileId) first, then by id
      selectedBudget = budgets.find((b) => b.cloudFileId === requestedSyncId || b.id === requestedSyncId);
      if (selectedBudget) {
        budgetId = selectedBudget.cloudFileId || selectedBudget.id || requestedSyncId;
        if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
          console.error(
            `[INIT] Found budget matching ACTUAL_BUDGET_SYNC_ID "${requestedSyncId}": "${selectedBudget.name}"`
          );
        }
      } else {
        // * Budget not found, but we'll try using the sync ID directly
        budgetId = requestedSyncId;
        if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
          console.error(
            `[INIT] Warning: Budget with sync ID "${requestedSyncId}" not found in list. Will attempt download anyway.`
          );
        }
      }
    } else {
      // * Use first budget if no sync ID specified
      selectedBudget = budgets[0];
      budgetId = selectedBudget.cloudFileId || selectedBudget.id || '';
      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        console.error(`[INIT] No ACTUAL_BUDGET_SYNC_ID specified, using first budget: "${selectedBudget.name}"`);
      }
    }

    if (!budgetId) {
      throw new Error('Could not determine budget ID to download.');
    }

    const budgetPassword: string | undefined = process.env.ACTUAL_BUDGET_PASSWORD;

    // * Log budget download attempt for debugging
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error(
        `[INIT] Attempting to download budget: ${budgetId}${budgetPassword ? ' (with password)' : ' (no password)'}`
      );
      if (selectedBudget) {
        console.error(
          `[INIT] Budget details: Name="${selectedBudget.name}", ID=${selectedBudget.id}, SyncID=${selectedBudget.cloudFileId || 'N/A'}`
        );
      }
    }

    try {
      if (budgetPassword) {
        await api.downloadBudget(budgetId, { password: budgetPassword });
      } else {
        await api.downloadBudget(budgetId);
      }
    } catch (downloadError) {
      // * Extract detailed error information for better error messages
      let detailedErrorInfo = '';
      if (downloadError && typeof downloadError === 'object') {
        const errorObj = downloadError as Record<string, unknown>;
        const errorDetails: string[] = [];

        if (errorObj.message) errorDetails.push(`message: ${errorObj.message}`);
        if (errorObj.code) errorDetails.push(`code: ${errorObj.code}`);
        if (errorObj.status) errorDetails.push(`status: ${errorObj.status}`);
        if (errorObj.statusCode) errorDetails.push(`statusCode: ${errorObj.statusCode}`);
        if (errorObj.statusText) errorDetails.push(`statusText: ${errorObj.statusText}`);
        if (errorObj.response) {
          try {
            errorDetails.push(`response: ${JSON.stringify(errorObj.response)}`);
          } catch {
            errorDetails.push('response: [could not stringify]');
          }
        }

        // * Get all property names
        const allProps = Object.getOwnPropertyNames(downloadError);
        if (allProps.length > 0) {
          errorDetails.push(`properties: ${allProps.join(', ')}`);
        }

        if (errorDetails.length > 0) {
          detailedErrorInfo = `\nError details: ${errorDetails.join(', ')}`;
        }
      }

      // * Log detailed error information before rethrowing
      console.error('[INIT] Budget download failed:', {
        budgetId,
        hasPassword: !!budgetPassword,
        error: downloadError,
        errorType: typeof downloadError,
        errorConstructor: downloadError?.constructor?.name,
        errorKeys: downloadError && typeof downloadError === 'object' ? Object.keys(downloadError) : [],
        errorString: String(downloadError),
        errorJson:
          downloadError && typeof downloadError === 'object'
            ? JSON.stringify(downloadError, Object.getOwnPropertyNames(downloadError))
            : null,
      });

      // * Create a more informative error
      const errorMessage =
        downloadError instanceof Error ? downloadError.message || 'Unknown error' : String(downloadError);

      const enhancedError = new Error(
        `Failed to download budget "${budgetId}". ${errorMessage}${detailedErrorInfo}\n` +
          `Budget ID: ${budgetId}\n` +
          `Password provided: ${budgetPassword ? 'Yes' : 'No'}\n` +
          `If the budget is encrypted, you may need to set ACTUAL_BUDGET_PASSWORD in your environment.`
      );

      // * Preserve stack trace
      if (downloadError instanceof Error && downloadError.stack) {
        enhancedError.stack = downloadError.stack;
      }

      throw enhancedError;
    }

    // Find the budget name for logging
    const loadedBudget = budgets.find((b) => b.cloudFileId === budgetId || b.id === budgetId);
    const budgetName = loadedBudget?.name || budgetId;

    initialized = true;

    // Track initialization time for performance logging
    initializationTime = Date.now() - startTime;
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error(`[PERF] 🔌 API initialized in ${initializationTime}ms`);
    }

    // Log successful budget load
    console.error(`✓ Budget loaded: ${budgetName}`);
    if (process.env.ACTUAL_BUDGET_SYNC_ID) {
      console.error(`  Using ACTUAL_BUDGET_SYNC_ID: ${budgetId}`);
    }

    // Setup auto-sync if configured
    setupAutoSync();
  } catch (error) {
    console.error('Failed to initialize Actual Budget API:', error);

    // * Log full error details for debugging
    if (error && typeof error === 'object') {
      console.error('Error details:', {
        constructor: error.constructor?.name,
        keys: Object.keys(error),
        ownPropertyNames: Object.getOwnPropertyNames(error),
        stringValue: String(error),
        jsonAttempt: (() => {
          try {
            return JSON.stringify(error, Object.getOwnPropertyNames(error));
          } catch {
            return 'Could not stringify error';
          }
        })(),
      });
    }

    // * Extract detailed error information for better error messages
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message || 'Unknown error';
      // * Check for additional properties that might contain error info
      if (!errorMessage || errorMessage === 'Unknown error') {
        const errorAny = error as unknown as Record<string, unknown>;
        if (errorAny.code) errorMessage = `Error code: ${errorAny.code}`;
        else if (errorAny.status) errorMessage = `HTTP status: ${errorAny.status}`;
        else if (errorAny.statusCode) errorMessage = `HTTP status code: ${errorAny.statusCode}`;
        else if (errorAny.statusText) errorMessage = `HTTP status text: ${errorAny.statusText}`;
        else if (errorAny.response) {
          try {
            errorMessage = `API response: ${JSON.stringify(errorAny.response)}`;
          } catch {
            errorMessage = 'API response error (could not stringify)';
          }
        }
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error !== null && error !== undefined) {
      // * Try to extract additional error information
      const errorObj = error as Record<string, unknown>;
      if (errorObj.message) {
        errorMessage = String(errorObj.message);
      } else if (errorObj.error) {
        errorMessage = String(errorObj.error);
      } else if (errorObj.code) {
        errorMessage = `Error code: ${errorObj.code}`;
      } else if (errorObj.status) {
        errorMessage = `HTTP status: ${errorObj.status}`;
      } else if (errorObj.statusCode) {
        errorMessage = `HTTP status code: ${errorObj.statusCode}`;
      } else if (errorObj.statusText) {
        errorMessage = `HTTP status text: ${errorObj.statusText}`;
      } else {
        try {
          errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch {
          errorMessage = String(error);
        }
      }
    }

    // * Create error with detailed message
    initializationError = error instanceof Error ? new Error(errorMessage) : new Error(errorMessage);

    // * Preserve original error properties if available
    if (error instanceof Error && error.stack) {
      initializationError.stack = error.stack;
    }

    throw initializationError;
  } finally {
    initializing = false;
  }
}

/**
 * Setup automatic budget sync on an interval
 */
function setupAutoSync(): void {
  // Clear any existing interval
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }

  // Check if auto-sync is configured
  const intervalMinutes = process.env.AUTO_SYNC_INTERVAL_MINUTES;
  if (!intervalMinutes) {
    return;
  }

  const minutes = parseInt(intervalMinutes, 10);

  // Support disabling with interval=0
  if (isNaN(minutes) || minutes <= 0) {
    return;
  }

  // Convert minutes to milliseconds
  const intervalMs = minutes * 60 * 1000;

  // Setup interval for background sync
  autoSyncInterval = setInterval(async () => {
    try {
      if (typeof api.sync === 'function') {
        await api.sync();
        if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
          console.error(`[AUTO-SYNC] ✓ Budget synced successfully`);
        }
      }
    } catch (error) {
      console.error('[AUTO-SYNC] Failed to sync budget:', error);
    }
  }, intervalMs);

  console.error(`✓ Auto-sync enabled: every ${minutes} minute${minutes !== 1 ? 's' : ''}`);
}

/**
 * Shutdown the Actual Budget API
 */
export async function shutdownActualApi(): Promise<void> {
  if (!initialized) return;

  // Clean up auto-sync interval
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }

  await api.shutdown();
  initialized = false;
}

/**
 * Get initialization performance statistics
 */
export function getInitializationStats(): {
  initializationTime: number | null;
  skipCount: number;
  timeSaved: number;
} {
  const timeSaved = initializationTime ? initializationTime * initializationSkipCount : 0;
  return {
    initializationTime,
    skipCount: initializationSkipCount,
    timeSaved,
  };
}

/**
 * Reset initialization statistics (useful for testing)
 */
export function resetInitializationStats(): void {
  initializationSkipCount = 0;
}

/**
 * Ensure the Actual Budget API connection is healthy
 * Automatically reconnects if connection is lost
 * @param operation - Function to execute after ensuring connection
 * @returns Result of the operation
 */
async function ensureConnection<T>(operation: () => Promise<T>): Promise<T> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Skip health check if we're already initializing to avoid recursion
      if (!initializing) {
        const isHealthy = await checkConnectionHealth();

        if (!isHealthy) {
          if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
            console.error(
              `[CONNECTION] Connection unhealthy, attempting reconnect (attempt ${attempt + 1}/${maxRetries + 1})`
            );
          }

          // Force reconnection
          initialized = false;
          await initActualApi(true);
        } else if (!initialized) {
          // Ensure initialization (in case initialized flag is false but connection works)
          await initActualApi();
        }
      } else {
        // If already initializing, wait for it to complete
        while (initializing) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (initializationError) {
          throw initializationError;
        }
      }

      // Try the operation
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message.toLowerCase();

      // Check if this is a connection error
      const isConnectionError =
        errorMessage.includes('not connected') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('unknown operator'); // Some API errors indicate connection issues

      if (isConnectionError && attempt < maxRetries) {
        if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
          console.error(
            `[CONNECTION] Connection error detected, reconnecting (attempt ${attempt + 1}/${maxRetries + 1}): ${errorMessage}`
          );
        }

        // Reset connection state and retry
        initialized = false;
        checkingHealth = false;
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1))); // Exponential backoff
        continue;
      }

      // Not a connection error or max retries reached
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Failed to ensure connection');
}

// ----------------------------
// FETCH
// ----------------------------

/**
 * Get all accounts (ensures API is initialized)
 */
export async function getAccounts(): Promise<APIAccountEntity[]> {
  return ensureConnection(() => api.getAccounts());
}

/**
 * Get all categories (ensures API is initialized)
 */
export async function getCategories(): Promise<APICategoryEntity[]> {
  return ensureConnection(() => api.getCategories());
}

/**
 * Get all category groups (ensures API is initialized)
 */
export async function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  return ensureConnection(() => api.getCategoryGroups());
}

/**
 * Get all payees (ensures API is initialized)
 */
export async function getPayees(): Promise<APIPayeeEntity[]> {
  return ensureConnection(() => api.getPayees());
}

/**
 * Get transactions for a specific account and date range (ensures API is initialized)
 */
export async function getTransactions(accountId: string, start: string, end: string): Promise<TransactionEntity[]> {
  return ensureConnection(() => api.getTransactions(accountId, start, end));
}

/**
 * Get all rules (ensures API is initialized)
 */
export async function getRules(): Promise<RuleEntity[]> {
  return ensureConnection(() => api.getRules());
}

/**
 * Get account balance for a specific account and date (ensures API is initialized)
 */
export async function getAccountBalance(accountId: string, date?: string): Promise<number> {
  return ensureConnection(() => api.getAccountBalance(accountId, date));
}

// ----------------------------
// ACTION
// ----------------------------

/**
 * Create a new payee (ensures API is initialized)
 */
export async function createPayee(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createPayee(args);
    cacheService.invalidate('payees:all');
    return result;
  });
}

/**
 * Update a payee (ensures API is initialized)
 */
export async function updatePayee(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updatePayee(id, args);
    cacheService.invalidate('payees:all');
    return result;
  });
}

/**
 * Delete a payee (ensures API is initialized)
 */
export async function deletePayee(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.deletePayee(id);
    cacheService.invalidate('payees:all');
    return result;
  });
}

/**
 * Create a new rule (ensures API is initialized)
 */
export async function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return ensureConnection(() => api.createRule(args));
}

/**
 * Update a rule (ensures API is initialized)
 */
export async function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return ensureConnection(() => api.updateRule(args));
}

/**
 * Delete a rule (ensures API is initialized)
 */
export async function deleteRule(id: string): Promise<boolean> {
  return ensureConnection(() => api.deleteRule(id));
}

/**
 * Create a new category (ensures API is initialized)
 */
export async function createCategory(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createCategory(args);
    cacheService.invalidate('categories:all');
    return result;
  });
}

/**
 * Update a category (ensures API is initialized)
 */
export async function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateCategory(id, args);
    cacheService.invalidate('categories:all');
    return result;
  });
}

/**
 * Delete a category (ensures API is initialized)
 */
export async function deleteCategory(id: string): Promise<{ error?: string }> {
  return ensureConnection(async () => {
    const result = await api.deleteCategory(id);
    cacheService.invalidate('categories:all');
    return result;
  });
}

/**
 * Create a new category group (ensures API is initialized)
 */
export async function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createCategoryGroup(args);
    cacheService.invalidate('categoryGroups:all');
    return result;
  });
}

/**
 * Update a category group (ensures API is initialized)
 */
export async function updateCategoryGroup(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateCategoryGroup(id, args);
    cacheService.invalidate('categoryGroups:all');
    return result;
  });
}

/**
 * Delete a category group (ensures API is initialized)
 */
export async function deleteCategoryGroup(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.deleteCategoryGroup(id);
    cacheService.invalidate('categoryGroups:all');
    return result;
  });
}

/**
 * Add transactions to an account (ensures API is initialized)
 */
export async function addTransactions(
  accountId: string,
  transactions: Array<{
    date: string;
    amount: number;
    payee?: string | null;
    category?: string | null;
    notes?: string;
    cleared?: boolean;
  }>,
  options?: { learnCategories?: boolean; runTransfers?: boolean }
): Promise<'ok'> {
  return ensureConnection(() => api.addTransactions(accountId, transactions, options));
}

/**
 * Import transactions with duplicate detection and rule execution (ensures API is initialized)
 *
 * @param accountId - Account ID to import transactions into
 * @param transactions - Array of transactions to import
 * @param opts - Optional import options (e.g., defaultCleared)
 * @returns Result with added/updated transaction IDs and any errors
 */
export async function importTransactions(
  accountId: string,
  transactions: Array<{
    date: string;
    amount: number;
    payee?: string | null;
    payee_name?: string;
    imported_payee?: string;
    category?: string | null;
    notes?: string;
    imported_id?: string;
    cleared?: boolean;
    subtransactions?: Array<{
      amount: number;
      category?: string | null;
      notes?: string;
    }>;
  }>,
  opts?: ImportTransactionsOpts
): Promise<{ errors?: Array<{ message: string }>; added: string[]; updated: string[] }> {
  return ensureConnection(async () => {
    const transactionsWithAccount = transactions.map((transaction) => ({
      account: accountId,
      ...transaction,
      payee: transaction.payee ?? undefined,
      category: transaction.category ?? undefined,
      subtransactions: transaction.subtransactions?.map((subtransaction) => ({
        ...subtransaction,
        category: subtransaction.category ?? undefined,
      })),
    }));
    const result = await api.importTransactions(accountId, transactionsWithAccount, opts);

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((err: { message: string }) => err.message).join('; ');
      throw new Error(`importTransactions reported errors: ${errorMessages}`);
    }

    cacheService.invalidate('transactions');
    cacheService.invalidate('accounts:all');

    return result;
  });
}

/**
 * Update a transaction (ensures API is initialized)
 *
 * @param id - Transaction ID to update
 * @param updates - Fields to update
 * @returns Promise that resolves when update is complete
 */
export async function updateTransaction(id: string, updates: Record<string, unknown>): Promise<void> {
  return ensureConnection(async () => {
    await api.updateTransaction(id, updates);
    cacheService.invalidate('transactions');
  });
}

/**
 * Delete a transaction (ensures API is initialized)
 *
 * @param id - Transaction ID to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteTransaction(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteTransaction(id);
    cacheService.invalidate('transactions');
  });
}

/**
 * Create a new account (ensures API is initialized)
 */
export async function createAccount(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createAccount(args);
    cacheService.invalidate('accounts:all');
    return result;
  });
}

/**
 * Update an account (ensures API is initialized)
 */
export async function updateAccount(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateAccount(id, args);
    cacheService.invalidate('accounts:all');
    return result;
  });
}

/**
 * Close an account (ensures API is initialized)
 */
export async function closeAccount(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.closeAccount(id);
    cacheService.invalidate('accounts:all');
    return result;
  });
}

/**
 * Reopen a closed account (ensures API is initialized)
 */
export async function reopenAccount(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.reopenAccount(id);
    cacheService.invalidate('accounts:all');
    return result;
  });
}

/**
 * Delete an account (ensures API is initialized)
 */
export async function deleteAccount(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.deleteAccount(id);
    cacheService.invalidate('accounts:all');
    return result;
  });
}

/**
 * Get all budget months (ensures API is initialized)
 */
export async function getBudgetMonths(): Promise<string[]> {
  return ensureConnection(() => api.getBudgetMonths());
}

/**
 * Get budget data for a specific month (ensures API is initialized)
 */
export async function getBudgetMonth(month: string): Promise<unknown> {
  return ensureConnection(() => api.getBudgetMonth(month));
}

/**
 * Set budget amount for a category in a specific month (ensures API is initialized)
 */
export async function setBudgetAmount(month: string, categoryId: string, amount: number): Promise<unknown> {
  return ensureConnection(() => api.setBudgetAmount(month, categoryId, amount));
}

/**
 * Set budget carryover for a category in a specific month (ensures API is initialized)
 */
export async function setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<unknown> {
  return ensureConnection(() => api.setBudgetCarryover(month, categoryId, flag));
}

/**
 * Hold budget amount for next month (ensures API is initialized)
 */
export async function holdBudgetForNextMonth(month: string, amount: number): Promise<unknown> {
  return ensureConnection(() => api.holdBudgetForNextMonth(month, amount));
}

/**
 * Reset budget hold for a specific month (ensures API is initialized)
 */
export async function resetBudgetHold(month: string): Promise<unknown> {
  return ensureConnection(() => api.resetBudgetHold(month));
}

/**
 * Create a new schedule (ensures API is initialized)
 */
export async function createSchedule(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    if (!extendedApi.createSchedule) {
      throw new Error('createSchedule method is not available in this version of the API');
    }
    return extendedApi.createSchedule(args);
  });
}

/**
 * Update a schedule (ensures API is initialized)
 */
export async function updateSchedule(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    if (!extendedApi.updateSchedule) {
      throw new Error('updateSchedule method is not available in this version of the API');
    }
    return extendedApi.updateSchedule(id, args);
  });
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
  });
}

/**
 * Get all schedules (ensures API is initialized)
 */
export async function getSchedules(): Promise<unknown[]> {
  return ensureConnection(async () => {
    return extendedApi.getSchedules!();
  });
}

/**
 * Merge multiple payees into a target payee (ensures API is initialized)
 */
export async function mergePayees(targetId: string, sourceIds: string[]): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.mergePayees(targetId, sourceIds);
    cacheService.invalidate('payees:all');
    return result;
  });
}

/**
 * Get rules for a specific payee (ensures API is initialized)
 */
export async function getPayeeRules(payeeId: string): Promise<RuleEntity[]> {
  return ensureConnection(() => api.getPayeeRules(payeeId));
}

/**
 * Get all budgets (ensures API is initialized)
 */
export async function getBudgets(): Promise<BudgetFile[]> {
  return ensureConnection(() => api.getBudgets());
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
  });
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
  });
}

/**
 * Sync with the server (ensures API is initialized)
 */
export async function sync(): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.sync === 'function') {
      return api.sync();
    }
    throw new Error('sync method is not available in this version of the API');
  });
}

/**
 * Run bank sync (ensures API is initialized)
 */
export async function runBankSync(accountId?: string): Promise<unknown> {
  return ensureConnection(async () => {
    if (extendedApi.runBankSync) {
      return extendedApi.runBankSync(accountId ? { accountId } : undefined);
    }
    throw new Error('runBankSync method is not available in this version of the API');
  });
}

/**
 * Run import (ensures API is initialized)
 */
export async function runImport(file: string, importType?: string): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.runImport === 'function') {
      return api.runImport(file, importType);
    }
    throw new Error('runImport method is not available in this version of the API');
  });
}

/**
 * Batch budget updates (ensures API is initialized)
 */
export async function batchBudgetUpdates(updates: Array<Record<string, unknown>>): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.batchBudgetUpdates === 'function') {
      return api.batchBudgetUpdates(updates);
    }
    throw new Error('batchBudgetUpdates method is not available in this version of the API');
  });
}

/**
 * Run an ActualQL query (ensures API is initialized)
 */
export async function runQuery(query: string): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.runQuery === 'function') {
      return api.runQuery({ query });
    }
    throw new Error('runQuery method is not available in this version of the API');
  });
}

/**
 * Get server version (ensures API is initialized)
 */
export async function getServerVersion(): Promise<{ error?: string } | { version: string }> {
  return ensureConnection(async () => {
    if (extendedApi.getServerVersion) {
      return extendedApi.getServerVersion();
    }
    throw new Error('getServerVersion method is not available in this version of the API');
  });
}

/**
 * Get ID by name for accounts, categories, payees, or schedules (ensures API is initialized)
 */
export async function getIDByName(type: string, name: string): Promise<string> {
  return ensureConnection(async () => {
    if (extendedApi.getIDByName) {
      return extendedApi.getIDByName({ type, string: name });
    }
    throw new Error('getIDByName method is not available in this version of the API');
  });
}
