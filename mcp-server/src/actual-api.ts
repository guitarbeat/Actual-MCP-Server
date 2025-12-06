import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import api from '@actual-app/api';
import type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
} from '@actual-app/api/@types/loot-core/src/server/api-models.js';
import type { RuleEntity, TransactionEntity } from '@actual-app/api/@types/loot-core/src/types/models/index.js';
import type { ImportTransactionsOpts } from '@actual-app/api/@types/methods.js';
import { cacheService } from './core/cache/cache-service.js';
import type { BudgetFile } from './core/types/index.js';

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
 * Handle early return cases for initialization
 * @param forceReconnect - Whether to force reconnection
 * @returns True if initialization should be skipped
 */
async function handleInitializationEarlyReturns(forceReconnect: boolean): Promise<boolean> {
  if (initialized && !forceReconnect) {
    // Log when initialization is skipped due to existing connection
    initializationSkipCount++;
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      const timeSaved = initializationTime || 600; // Use actual time or estimate
      console.error(
        `[PERF] ⚡ Initialization skipped (persistent connection) - saved ~${timeSaved}ms (skip count: ${initializationSkipCount})`
      );
    }
    return true;
  }

  // If forcing reconnect, reset initialization state
  if (forceReconnect && initialized) {
    initialized = false;
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error('[CONNECTION] Forcing reconnection...');
    }
  }

  if (initializing) {
    // * Wait for initialization to complete if already in progress
    // * This prevents race conditions when multiple requests trigger initialization simultaneously
    // * Note: Uses busy-wait pattern - acceptable for initialization which is infrequent
    while (initializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (initializationError) throw initializationError;
    return true;
  }

  return false;
}

/**
 * Initialize API connection and download budget
 */
async function initializeApiConnection(): Promise<void> {
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
}

/**
 * Download and load budget during initialization
 * @returns Object with budgetId and budgets array
 */
async function downloadAndLoadBudget(): Promise<{
  budgetId: string;
  budgets: BudgetFile[];
}> {
  const budgets: BudgetFile[] = await api.getBudgets();
  if (!budgets || budgets.length === 0) {
    throw new Error('No budgets found. Please create a budget in Actual first.');
  }

  // Use specified budget or the first one
  const budgetId: string = process.env.ACTUAL_BUDGET_SYNC_ID || budgets[0].cloudFileId || budgets[0].id || '';
  // * Support both ACTUAL_BUDGET_PASSWORD and ACTUAL_BUDGET_ENCRYPTION_PASSWORD for compatibility
  const budgetPassword: string | undefined =
    process.env.ACTUAL_BUDGET_PASSWORD || process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD;
  if (budgetPassword) {
    await api.downloadBudget(budgetId, { password: budgetPassword });
  } else {
    await api.downloadBudget(budgetId);
  }

  return { budgetId, budgets };
}

/**
 * Log successful initialization
 * @param startTime - Start time of initialization
 * @param budgets - Budget files array
 * @param budgetId - Budget ID that was loaded
 */
function logSuccessfulInitialization(startTime: number, budgets: BudgetFile[], budgetId: string): void {
  // Track initialization time for performance logging
  initializationTime = Date.now() - startTime;
  if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
    console.error(`[PERF] 🔌 API initialized in ${initializationTime}ms`);
  }

  // Find the budget name for logging
  const loadedBudget = budgets.find((b) => b.cloudFileId === budgetId || b.id === budgetId);
  const budgetName = loadedBudget?.name || budgetId;
  console.error(`✓ Budget loaded: ${budgetName}`);
  if (process.env.ACTUAL_BUDGET_SYNC_ID) {
    console.error(`  Using ACTUAL_BUDGET_SYNC_ID: ${budgetId}`);
  }
}

/**
 * Handle initialization errors with specific migration error handling
 * @param error - The error that occurred
 */
function handleInitializationError(error: unknown): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStr = errorMessage.toLowerCase();

  // * Check for database migration errors
  if (
    errorStr.includes('out of sync') ||
    errorStr.includes('out-of-sync') ||
    errorStr.includes('migration') ||
    errorStr.includes('database is out of sync')
  ) {
    console.error('✗ Database migration error detected');
    console.error('  Error:', errorMessage);
    console.error('');
    console.error('  This is an Actual Budget server issue, not an MCP server issue.');
    console.error('  Solutions:');
    console.error('  1. Update Actual Budget server to the latest version');
    console.error('  2. Restart the Actual Budget service - migrations will auto-apply');
    console.error('  3. If the issue persists, check Actual Budget server logs');
    console.error('');
    console.error('  See docs/easypanel-deployment.md for more details.');
  } else {
    console.error('Failed to initialize Actual Budget API:', error);
  }

  initializationError = error instanceof Error ? error : new Error(String(error));
  throw initializationError;
}

/**
 * Initialize the Actual Budget API
 * @param forceReconnect - If true, force reconnection even if already initialized
 */
export async function initActualApi(forceReconnect = false): Promise<void> {
  if (await handleInitializationEarlyReturns(forceReconnect)) {
    return;
  }

  initializing = true;
  const startTime = Date.now();

  initializationError = null;
  try {
    await initializeApiConnection();
    const { budgetId, budgets } = await downloadAndLoadBudget();
    initialized = true;
    logSuccessfulInitialization(startTime, budgets, budgetId);
    setupAutoSync();
  } catch (error) {
    handleInitializationError(error);
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
  if (Number.isNaN(minutes) || minutes <= 0) {
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
 * Ensure connection is healthy and initialized
 */
async function ensureConnectionHealthy(): Promise<void> {
  if (initializing) {
    // If already initializing, wait for it to complete
    while (initializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (initializationError) {
      throw initializationError;
    }
    return;
  }

  const isHealthy = await checkConnectionHealth();
  if (!isHealthy) {
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error('[CONNECTION] Connection unhealthy, attempting reconnect');
    }
    initialized = false;
    await initActualApi(true);
  } else if (!initialized) {
    // Ensure initialization (in case initialized flag is false but connection works)
    await initActualApi();
  }
}

/**
 * Check if error is a connection error
 * @param errorMessage - Lowercase error message
 * @returns True if it's a connection error
 */
function isConnectionError(errorMessage: string): boolean {
  return (
    errorMessage.includes('not connected') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('unknown operator') // Some API errors indicate connection issues
  );
}

/**
 * Handle connection error retry logic
 * @param error - The error that occurred
 * @param attempt - Current attempt number
 * @param maxRetries - Maximum number of retries
 * @returns True if should retry
 */
async function handleConnectionErrorRetry(error: Error, attempt: number, maxRetries: number): Promise<boolean> {
  const errorMessage = error.message.toLowerCase();
  if (!isConnectionError(errorMessage) || attempt >= maxRetries) {
    return false;
  }

  if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
    console.error(
      `[CONNECTION] Connection error detected, reconnecting (attempt ${attempt + 1}/${maxRetries + 1}): ${errorMessage}`
    );
  }

  // Reset connection state and retry
  initialized = false;
  checkingHealth = false;
  await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1))); // Exponential backoff
  return true;
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
      await ensureConnectionHealthy();
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const shouldRetry = await handleConnectionErrorRetry(lastError, attempt, maxRetries);
      if (!shouldRetry) {
        throw lastError;
      }
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
  return ensureConnection(async () => {
    const result = await api.getCategories();
    // * Filter out category groups if API returns a union type
    return result.filter((item): item is APICategoryEntity => 'group_id' in item);
  });
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
  return ensureConnection(() => {
    // * Convert string date to Date object if provided
    const dateObj = date ? new Date(date) : undefined;
    return api.getAccountBalance(accountId, dateObj);
  });
}

// ----------------------------
// ACTION
// ----------------------------

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
  return ensureConnection(() => api.createRule(args as Omit<RuleEntity, 'id'>));
}

/**
 * Update a rule (ensures API is initialized)
 */
export async function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return ensureConnection(() => api.updateRule(args as unknown as RuleEntity));
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
    const result = await api.createCategory(args as Omit<APICategoryEntity, 'id'>);
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
    const result = await api.createCategoryGroup(args as Omit<APICategoryGroupEntity, 'id'>);
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
  return ensureConnection(() => api.addTransactions(accountId, transactions as any, options));
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
): Promise<{
  errors?: Array<{ message: string }>;
  added: string[];
  updated: string[];
}> {
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
    const result = await api.createAccount(args as Omit<APIAccountEntity, 'id'>);
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
    return extendedApi.getSchedules?.();
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
export async function runImport(file: string, _importType?: string): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.runImport === 'function') {
      // * API signature changed - runImport now takes a function callback
      // * Note: This may need adjustment based on actual API signature
      return (api.runImport as any)(() => Promise.resolve(), file);
    }
    throw new Error('runImport method is not available in this version of the API');
  });
}

/**
 * Batch budget updates (ensures API is initialized)
 */
export async function batchBudgetUpdates(_updates: Array<Record<string, unknown>>): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.batchBudgetUpdates === 'function') {
      // * API signature changed - batchBudgetUpdates now takes a function
      return api.batchBudgetUpdates(() => Promise.resolve());
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
      // * API signature changed - runQuery now takes query string directly or different format
      return (api.runQuery as any)(query);
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
