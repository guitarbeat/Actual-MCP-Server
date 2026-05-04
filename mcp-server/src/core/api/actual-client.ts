import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import '../../polyfill.js';
import api from '@actual-app/api';
import type {
  RuleEntity,
  TransactionEntity,
} from '@actual-app/api/@types/loot-core/src/types/models/index.js';
import type { ImportTransactionsOpts } from '@actual-app/api/@types/methods.js';
import type {
  ActualConnectionState,
  ActualReadFreshnessMode,
  ActualReadinessStatus,
  ActualReadinessStatusExtended,
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
  APIScheduleEntity,
  APITagEntity,
  ExtendedActualApi,
  HistoricalTransferApplyCandidateResult,
  HistoricalTransferApplyResult,
  HistoricalTransferInternalTransaction,
} from './actual-client/types.js';
import {
  getDateDiffInDays,
  parseHistoricalTransferCandidateId,
} from '../analysis/historical-transfer-utils.js';
import { validateActualAuthStartupConfig } from '../auth/startup-guard.js';
import { cacheService } from '../cache/cache-service.js';
import type { BudgetFile } from '../types/index.js';
import {
  getBudgetDownloadIdentifier,
  loadBudgetByResolvedIdentifier,
  matchesBudgetIdentifier,
} from './actual-client/budget-resolution.js';
import {
  invalidateAllReadState,
  invalidateNameResolutionState,
} from './actual-client/cache-helpers.js';
import {
  getAllPotentialHistoricalTransferCounterparts,
  getBatchHistoricalTransferTransactions,
  getHistoricalTransferInternalLayer,
  isValidHistoricalTransferTransaction,
} from './actual-client/historical-transfers.js';
import { normalizeUnknownError, serializeUnknownError } from '../utils/error-serialization.js';

export type {
  ActualConnectionState,
  ActualConnectionStatus,
  ActualReadFreshnessMode,
  ActualReadinessStatus,
  ActualReadinessStatusExtended,
  HistoricalTransferApplyResult,
} from './actual-client/types.js';

const extendedApi: ExtendedActualApi = api as ExtendedActualApi;

const DEFAULT_DATA_DIR: string = path.resolve(os.homedir() || '.', '.actual');
const DEFAULT_READ_FRESHNESS_MODE = 'cached';

const INITIAL_CONNECTION_STATE: ActualConnectionState = {
  status: 'disconnected',
  lastReadyAt: null,
  lastSyncAt: null,
  lastError: null,
  debugError: null,
  activeBudgetId: null,
};

// API initialization state
let initialized = false;
let initializationError: Error | null = null;
/** Serializes init/reconnect/shutdown so concurrent callers cannot interleave or race on shared API state. */
let initMutexChain: Promise<void> = Promise.resolve();
let checkingHealth = false; // Prevent recursion in health checks
let connectionState: ActualConnectionState = { ...INITIAL_CONNECTION_STATE };

// Performance tracking for initialization
let initializationTime: number | null = null;
let initializationSkipCount = 0;

// Auto-sync state
let autoSyncInterval: NodeJS.Timeout | null = null;

// Background retry state
let backgroundRetryTimer: NodeJS.Timeout | null = null;
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 10000; // 10 seconds

function nowAsIsoString(): string {
  return new Date().toISOString();
}

function getReadFreshnessMode(): ActualReadFreshnessMode {
  return process.env.ACTUAL_READ_FRESHNESS_MODE === 'strict-live'
    ? 'strict-live'
    : DEFAULT_READ_FRESHNESS_MODE;
}

function isStrictLiveReadMode(): boolean {
  return getReadFreshnessMode() === 'strict-live';
}

function sanitizeConnectionError(error: unknown): string {
  const errorMessage = serializeUnknownError(error ?? 'unknown error');
  const errorStr = errorMessage.toLowerCase();

  if (errorStr.includes('live sync required before read failed')) {
    return 'live_sync_failed';
  }
  if (
    errorStr.includes('out of sync') ||
    errorStr.includes('out-of-sync') ||
    errorStr.includes('migration')
  ) {
    return 'migration_in_progress';
  }
  if (errorStr.includes('timeout')) {
    return 'connection_timeout';
  }
  if (
    errorStr.includes('auth') ||
    errorStr.includes('password') ||
    errorStr.includes('unauthorized')
  ) {
    return 'authentication_failed';
  }
  if (errorStr.includes('no budgets found')) {
    return 'no_budgets_found';
  }
  if (errorStr.includes('no budget file is open') || errorStr.includes('budget file')) {
    return 'budget_not_loaded';
  }
  if (
    errorStr.includes('not connected') ||
    errorStr.includes('connection') ||
    errorStr.includes('network') ||
    errorStr.includes('econnrefused')
  ) {
    return 'connection_failed';
  }
  if (errorStr.includes('not found') || errorStr.includes('404')) {
    return 'budget_not_found';
  }
  if (
    errorStr.includes('decrypt') ||
    errorStr.includes('encrypt') ||
    errorStr.includes('encryption')
  ) {
    return 'encryption_error';
  }
  if (
    errorStr.includes('enotfound') ||
    errorStr.includes('ehostunreach') ||
    errorStr.includes('dns')
  ) {
    return 'server_unreachable';
  }
  if (
    errorStr.includes('eacces') ||
    errorStr.includes('permission') ||
    errorStr.includes('eperm')
  ) {
    return 'permission_denied';
  }
  if (errorStr.includes('disk') || errorStr.includes('space') || errorStr.includes('enospc')) {
    return 'storage_error';
  }

  // Log raw error for debugging when no pattern matches
  console.error('[CONNECTION] Unrecognized error (raw):', errorMessage);

  return 'unknown_error';
}

function updateConnectionState(patch: Partial<ActualConnectionState>): void {
  connectionState = {
    ...connectionState,
    ...patch,
  };
}

function markConnectionInitializing(): void {
  updateConnectionState({
    status: 'initializing',
    lastError: null,
  });
}

function markConnectionReady(budgetId: string): void {
  initialized = true;
  updateConnectionState({
    status: 'ready',
    lastReadyAt: nowAsIsoString(),
    lastError: null,
    debugError: null,
    activeBudgetId: budgetId,
  });
}

function markConnectionError(error: unknown): void {
  initialized = false;
  const rawMessage = serializeUnknownError(error ?? 'unknown');
  updateConnectionState({
    status: 'error',
    lastError: sanitizeConnectionError(error),
    debugError: rawMessage,
  });
}

function markSyncSuccess(): void {
  updateConnectionState({
    lastSyncAt: nowAsIsoString(),
    lastError: null,
  });
}

function createLiveSyncRequiredError(error: unknown): Error {
  const message = serializeUnknownError(error ?? 'unknown error');
  return new Error(`Live sync required before read failed: ${message}`);
}

async function syncForLiveRead(): Promise<void> {
  if (!isStrictLiveReadMode()) {
    return;
  }

  try {
    await sync();
  } catch (error) {
    const syncError = createLiveSyncRequiredError(error);
    markConnectionError(syncError);
    throw syncError;
  }
}

interface ReadOperationOptions {
  cacheKey?: string;
  ttl?: number;
}

async function runReadOperation<T>(
  fetchFn: () => Promise<T>,
  options?: ReadOperationOptions,
): Promise<T> {
  return ensureConnection(async (): Promise<T> => {
    if (isStrictLiveReadMode()) {
      await syncForLiveRead();
      return fetchFn();
    }

    if (options?.cacheKey) {
      return (await cacheService.getOrFetch(
        options.cacheKey,
        fetchFn as () => Promise<NonNullable<T>>,
        options.ttl,
      )) as T;
    }

    return fetchFn();
  });
}

function enqueueInit<T>(work: () => Promise<T>, timeoutMs = 55000): Promise<T> {
  const next = initMutexChain.then(() => {
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Initialization timed out after ${Math.floor(timeoutMs / 1000)} seconds`));
      }, timeoutMs);
    });
    return Promise.race([work(), timeoutPromise]).finally(() => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    });
  });
  initMutexChain = next.then(
    () => {},
    () => {},
  );
  return next;
}

/**
 * Check if the Actual Budget API connection is healthy
 * @returns true if connection is healthy, false otherwise
 */
async function checkConnectionHealth(): Promise<boolean> {
  if (!initialized || connectionState.status !== 'ready') {
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
    const normalizedError = normalizeUnknownError(error);
    const errorMessage = normalizedError.message;
    const errorStr = errorMessage.toLowerCase();

    // Check for connection-related errors
    if (
      errorStr.includes('not connected') ||
      errorStr.includes('connection') ||
      errorStr.includes('econnrefused') ||
      errorStr.includes('network') ||
      errorStr.includes('timeout') ||
      errorStr.includes('no budget file is open') || // Budget was closed or lost
      errorStr.includes('budget file') // Catch other budget-related errors
    ) {
      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        console.error(
          `[CONNECTION] Health check failed - connection lost or budget closed: ${errorMessage}`,
        );
      }
      markConnectionError(normalizedError);
      return false;
    }

    // Unexpected non-connection errors should not flip readiness, but we still log them.
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error(
        `[CONNECTION] Health check encountered a non-connection error but kept readiness: ${errorMessage}`,
      );
    }

    return true;
  } finally {
    checkingHealth = false;
  }
}

/**
 * Initialize API connection and download budget
 */
async function initializeApiConnection(): Promise<void> {
  const dataDir = process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  validateActualAuthStartupConfig();

  const config: {
    dataDir: string;
    serverURL?: string;
    password?: string;
    sessionToken?: string;
  } = {
    dataDir,
  };

  if (process.env.ACTUAL_SERVER_URL) {
    config.serverURL = process.env.ACTUAL_SERVER_URL;

    if (process.env.ACTUAL_SESSION_TOKEN) {
      config.sessionToken = process.env.ACTUAL_SESSION_TOKEN;
    } else if (process.env.ACTUAL_PASSWORD) {
      config.password = process.env.ACTUAL_PASSWORD;
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: API types mismatch with env vars
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await api.init(config as any);
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

  // Validate specified budget ID against available budgets
  const specifiedId = process.env.ACTUAL_BUDGET_SYNC_ID;
  if (specifiedId) {
    const matchingBudget = budgets.find((b) => matchesBudgetIdentifier(b, specifiedId));
    if (!matchingBudget) {
      throw new Error(
        `ACTUAL_BUDGET_SYNC_ID "${specifiedId}" was not found in the available budgets. Update the configured sync ID before starting the server.`,
      );
    }
  }

  // Use specified budget or the first one
  const budgetId: string = (() => {
    const sid = process.env.ACTUAL_BUDGET_SYNC_ID;
    if (sid) {
      const match = budgets.find((b) => matchesBudgetIdentifier(b, sid));
      if (match) return sid;
      throw new Error(
        `ACTUAL_BUDGET_SYNC_ID "${sid}" was not found in the available budgets. Update the configured sync ID before starting the server.`,
      );
    }
    return getBudgetDownloadIdentifier(budgets[0]);
  })();

  // * Support both ACTUAL_BUDGET_PASSWORD and ACTUAL_BUDGET_ENCRYPTION_PASSWORD for compatibility
  const budgetPassword: string | undefined =
    process.env.ACTUAL_BUDGET_PASSWORD || process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD;

  // Find the target budget to check encryption status
  const targetBudget = budgets.find((b) => matchesBudgetIdentifier(b, budgetId)) as
    | (BudgetFile & { encryptKeyId?: string | null })
    | undefined;
  const hasEncryptionMetadata =
    targetBudget !== undefined && Object.hasOwn(targetBudget, 'encryptKeyId');
  const isEncrypted = Boolean(targetBudget?.encryptKeyId);
  const shouldUseBudgetPassword = Boolean(
    budgetPassword && (!hasEncryptionMetadata || isEncrypted),
  );

  if (budgetPassword && hasEncryptionMetadata && !isEncrypted) {
    console.error(
      '[CONNECTION] WARNING: Encryption password provided but budget is not encrypted. Ignoring password.',
    );
  }

  if (shouldUseBudgetPassword) {
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
function logSuccessfulInitialization(
  startTime: number,
  budgets: BudgetFile[],
  budgetId: string,
): void {
  // Track initialization time for performance logging
  initializationTime = Date.now() - startTime;
  if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
    console.error(`[PERF] API initialized in ${initializationTime}ms`);
  }

  // Find the budget name for logging
  const loadedBudget = budgets.find((b) => matchesBudgetIdentifier(b, budgetId));
  const budgetName = loadedBudget?.name || budgetId;
  console.error(`[CONNECTION] Budget loaded: ${budgetName}`);
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
    console.error('[CONNECTION] Database migration error detected');
    console.error('  Error:', errorMessage);
    console.error('');
    console.error('  This is an Actual Budget server issue, not an MCP server issue.');
    console.error('  Solutions:');
    console.error('  1. Update Actual Budget server to the latest version');
    console.error('  2. Restart the Actual Budget service - migrations will auto-apply');
    console.error('  3. If the issue persists, check Actual Budget server logs');
  } else if (error instanceof Error) {
    console.error('Failed to initialize Actual Budget API:', errorMessage);
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error('Failed to initialize Actual Budget API:', error);
  }

  initializationError = error instanceof Error ? error : new Error(String(error));
  markConnectionError(initializationError);
  throw initializationError;
}

/**
 * Initialize the Actual Budget API
 * @param forceReconnect - If true, force reconnection even if already initialized
 */
export async function initActualApi(forceReconnect = false): Promise<void> {
  return enqueueInit(async () => {
    if (initialized && !forceReconnect) {
      initializationSkipCount++;
      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        const timeSaved = initializationTime || 600;
        console.error(
          `[PERF] Initialization skipped (persistent connection) - saved ~${timeSaved}ms (skip count: ${initializationSkipCount})`,
        );
      }
      return;
    }

    if (forceReconnect && process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error('[CONNECTION] Forcing reconnection...');
    }

    initializationError = null;
    markConnectionInitializing();

    const startTime = Date.now();

    try {
      const connStart = Date.now();
      await initializeApiConnection();
      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        console.error(`[PERF] API connection initialized in ${Date.now() - connStart}ms`);
      }

      const budgetFetchStart = Date.now();
      const { budgetId, budgets } = await downloadAndLoadBudget();
      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        console.error(
          `[PERF] Budget list fetched and budget downloaded in ${Date.now() - budgetFetchStart}ms`,
        );
      }

      logSuccessfulInitialization(startTime, budgets, budgetId);
      markConnectionReady(budgetId);
      markSyncSuccess();
      invalidateAllReadState();
      setupAutoSync();
    } catch (error) {
      handleInitializationError(error);
    }
  });
}

/**
 * Start background retry for automatic recovery after initialization failure
 */
export function startBackgroundRetry(): void {
  if (backgroundRetryTimer) return; // Already retrying

  let attempt = 0;
  const retry = async () => {
    if (initialized) {
      backgroundRetryTimer = null;
      return;
    }
    attempt++;
    const delay = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), 120000); // Max 2 minutes
    console.error(
      `[CONNECTION] Background retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} in ${Math.round(delay / 1000)}s...`,
    );

    backgroundRetryTimer = setTimeout(async () => {
      try {
        await initActualApi(true);
        console.error('[CONNECTION] Background retry succeeded');
        backgroundRetryTimer = null;
      } catch (error) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          retry();
        } else {
          console.error(
            `[CONNECTION] All ${MAX_RETRY_ATTEMPTS} retry attempts failed. Manual intervention required.`,
          );
          backgroundRetryTimer = null;
        }
      }
    }, delay);
  };

  retry();
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
      await sync();
      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        console.error('[AUTO-SYNC] Budget synced successfully');
      }
    } catch (error) {
      console.error('[AUTO-SYNC] Failed to sync budget:', error);
    }
  }, intervalMs);

  console.error(`[AUTO-SYNC] Enabled: every ${minutes} minute${minutes !== 1 ? 's' : ''}`);
}

/**
 * Shutdown the Actual Budget API
 */
export async function shutdownActualApi(): Promise<void> {
  await enqueueInit(async () => {
    // Clean up auto-sync interval
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }

    // Clean up background retry timer
    if (backgroundRetryTimer) {
      clearTimeout(backgroundRetryTimer);
      backgroundRetryTimer = null;
    }

    if (!initialized) {
      initializationError = null;
      updateConnectionState({
        status: 'disconnected',
      });
      return;
    }

    try {
      await api.shutdown();
    } catch (error) {
      console.error('Error shutting down Actual Budget API:', error);
    } finally {
      initialized = false;
      initializationError = null;
      updateConnectionState({
        status: 'disconnected',
      });
    }
  });
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
 * Check if the API is currently initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Check if the API is currently initializing
 */
export function isInitializing(): boolean {
  return connectionState.status === 'initializing';
}

/**
 * Reset initialization statistics (useful for testing)
 */
export function resetInitializationStats(): void {
  initializationSkipCount = 0;
}

export function getConnectionState(): ActualConnectionState {
  return { ...connectionState };
}

export async function getReadinessStatus(forceCheck?: false): Promise<ActualReadinessStatus>;
export async function getReadinessStatus(forceCheck: true): Promise<ActualReadinessStatusExtended>;
export async function getReadinessStatus(
  forceCheck = false,
): Promise<ActualReadinessStatus | ActualReadinessStatusExtended> {
  if (forceCheck && initialized && connectionState.status === 'ready') {
    const isHealthy = await checkConnectionHealth();
    if (!isHealthy && process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error('[READINESS] Readiness probe detected an unhealthy Actual connection');
    }
  }

  const snapshot = getConnectionState();
  let reason = snapshot.lastError || 'not_initialized';

  if (snapshot.status === 'ready' && snapshot.activeBudgetId) {
    reason = 'ready';
  } else if (snapshot.status === 'initializing') {
    reason = 'initializing';
  } else if (snapshot.activeBudgetId && snapshot.status !== 'ready') {
    reason = snapshot.lastError || 'connection_error';
  } else if (!snapshot.activeBudgetId) {
    reason = snapshot.lastError || 'budget_not_loaded';
  }

  const base: ActualReadinessStatus = {
    ...snapshot,
    ready: snapshot.status === 'ready' && Boolean(snapshot.activeBudgetId),
    reason,
  };

  if (forceCheck) {
    let serverHostname: string | null = null;
    if (process.env.ACTUAL_SERVER_URL) {
      try {
        serverHostname = new URL(process.env.ACTUAL_SERVER_URL).hostname;
      } catch {
        serverHostname = '(invalid URL)';
      }
    }

    const extended: ActualReadinessStatusExtended = {
      ...base,
      diagnostics: {
        serverUrl: serverHostname,
        budgetSyncId: Boolean(process.env.ACTUAL_BUDGET_SYNC_ID),
        hasPassword: Boolean(process.env.ACTUAL_PASSWORD),
        hasSessionToken: Boolean(process.env.ACTUAL_SESSION_TOKEN),
        hasEncryptionPassword: Boolean(
          process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD || process.env.ACTUAL_BUDGET_PASSWORD,
        ),
        autoSyncMinutes: process.env.AUTO_SYNC_INTERVAL_MINUTES || null,
        readFreshnessMode: getReadFreshnessMode(),
        retrying: backgroundRetryTimer !== null,
      },
    };
    return extended;
  }

  return base;
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
    errorMessage.includes('unknown operator') || // Some API errors indicate connection issues
    errorMessage.includes('no budget file is open') || // Budget was closed or lost
    errorMessage.includes('budget file') // Catch other budget-related errors
  );
}

async function ensureReadConnectionAvailable(): Promise<void> {
  if (initialized && connectionState.status === 'ready') {
    return;
  }

  await initActualApi(connectionState.status === 'error' || initializationError !== null);
}

async function ensureWriteConnectionAvailable(): Promise<void> {
  if (!initialized || connectionState.status !== 'ready') {
    await initActualApi(connectionState.status === 'error' || initializationError !== null);
  }

  const isHealthy = await checkConnectionHealth();
  if (!isHealthy) {
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error('[CONNECTION] Connection unhealthy before write, reconnecting');
    }
    await initActualApi(true);
  }
}

type ConnectionMode = 'read' | 'write';

async function ensureConnection<T>(
  operation: () => Promise<T>,
  mode: ConnectionMode = 'read',
): Promise<T> {
  if (mode === 'write') {
    await ensureWriteConnectionAvailable();
    try {
      return await operation();
    } catch (error) {
      const resolvedError = normalizeUnknownError(error);
      if (isConnectionError(resolvedError.message.toLowerCase())) {
        markConnectionError(resolvedError);
      }
      throw resolvedError;
    }
  }

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await ensureReadConnectionAvailable();
      return await operation();
    } catch (error) {
      lastError = normalizeUnknownError(error);
      const shouldRetry =
        isConnectionError(lastError.message.toLowerCase()) && attempt < maxRetries;
      if (!shouldRetry) {
        if (isConnectionError(lastError.message.toLowerCase())) {
          markConnectionError(lastError);
        }
        throw lastError;
      }

      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        console.error(
          `[CONNECTION] Read operation failed, reconnecting (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError.message.toLowerCase()}`,
        );
      }

      markConnectionError(lastError);
      await initActualApi(true);
    }
  }

  throw lastError || new Error('Failed to ensure connection');
}

// ----------------------------
// FETCH
// ----------------------------

/**
 * Get all accounts (ensures API is initialized)
 */
export async function getAccounts(): Promise<APIAccountEntity[]> {
  return runReadOperation(() => api.getAccounts(), { cacheKey: 'accounts:all' });
}

/**
 * Get all categories (ensures API is initialized)
 */
export async function getCategories(): Promise<APICategoryEntity[]> {
  return runReadOperation(
    async () => {
      const result = await api.getCategories();
      // * Filter out category groups if API returns a union type
      return result.filter((item): item is APICategoryEntity => 'group_id' in item);
    },
    { cacheKey: 'categories:all' },
  );
}

/**
 * Get all category groups (ensures API is initialized)
 */
export async function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  return runReadOperation(() => api.getCategoryGroups(), { cacheKey: 'categoryGroups:all' });
}

/**
 * Get all payees (ensures API is initialized)
 */
export async function getPayees(): Promise<APIPayeeEntity[]> {
  return runReadOperation(() => api.getPayees(), { cacheKey: 'payees:all' });
}

/**
 * Get all tags (ensures API is initialized)
 */
export async function getTags(): Promise<APITagEntity[]> {
  return runReadOperation(() => api.getTags(), { cacheKey: 'tags:all' });
}

/**
 * Get transactions for a specific account and date range (ensures API is initialized)
 */
export async function getTransactions(
  accountId: string,
  start: string,
  end: string,
): Promise<TransactionEntity[]> {
  return runReadOperation(() => api.getTransactions(accountId, start, end), {
    cacheKey: `transactions:${accountId}:${start}:${end}`,
  });
}

/**
 * Get all rules (ensures API is initialized)
 */
export async function getRules(): Promise<RuleEntity[]> {
  return runReadOperation(() => api.getRules());
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
 * Create a new rule (ensures API is initialized)
 */
export async function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return ensureConnection(() => api.createRule(args as Omit<RuleEntity, 'id'>), 'write');
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
 * Create a new category (ensures API is initialized)
 */
export async function createCategory(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createCategory(args as Omit<APICategoryEntity, 'id'>);
    cacheService.invalidatePattern('categories:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update a category (ensures API is initialized)
 */
export async function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateCategory(id, args);
    cacheService.invalidatePattern('categories:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete a category (ensures API is initialized)
 */
export async function deleteCategory(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteCategory(id);
    cacheService.invalidatePattern('categories:*');
    invalidateNameResolutionState();
  }, 'write');
}

/**
 * Create a new category group (ensures API is initialized)
 */
export async function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  return ensureConnection(async () => {
    const result = await api.createCategoryGroup(args as Omit<APICategoryGroupEntity, 'id'>);
    cacheService.invalidatePattern('categoryGroups:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Update a category group (ensures API is initialized)
 */
export async function updateCategoryGroup(
  id: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.updateCategoryGroup(id, args);
    cacheService.invalidatePattern('categoryGroups:*');
    invalidateNameResolutionState();
    return result;
  }, 'write');
}

/**
 * Delete a category group (ensures API is initialized)
 */
export async function deleteCategoryGroup(id: string): Promise<void> {
  return ensureConnection(async () => {
    await api.deleteCategoryGroup(id);
    cacheService.invalidatePattern('categoryGroups:*');
    invalidateNameResolutionState();
  }, 'write');
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
    imported_id?: string;
    cleared?: boolean;
  }>,
  options?: { learnCategories?: boolean; runTransfers?: boolean },
): Promise<'ok'> {
  return ensureConnection(async () => {
    // @ts-expect-error - Transactions array structure matches what Actual API expects internally
    const result = await api.addTransactions(accountId, transactions, options);
    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
    return result;
  }, 'write');
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
  opts?: ImportTransactionsOpts,
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

    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();

    return result;
  }, 'write');
}

/**
 * Update a transaction (ensures API is initialized)
 *
 * @param id - Transaction ID to update
 * @param updates - Fields to update
 * @returns Promise that resolves when update is complete
 */
export async function updateTransaction(
  id: string,
  updates: Record<string, unknown>,
): Promise<void> {
  return ensureConnection(async () => {
    await api.updateTransaction(id, updates);
    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
  }, 'write');
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
    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
    invalidateNameResolutionState();
  }, 'write');
}

/**
 * Link already-imported transaction pairs as historical transfers using Actual's local data layer.
 * This intentionally bypasses the normal updateTransaction wrapper so it can link two existing rows
 * without creating duplicate counterpart transactions.
 */
export async function applyHistoricalTransfers(
  candidateIds: string[],
): Promise<HistoricalTransferApplyResult> {
  return ensureConnection(async () => {
    const { send, db } = getHistoricalTransferInternalLayer(extendedApi);
    const uniqueCandidateIds = [...new Set(candidateIds)];
    const [accounts, payees] = await Promise.all([api.getAccounts(), api.getPayees()]);
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    const transferPayeeByAccountId = new Map(
      payees
        .filter((payee) => typeof payee.transfer_acct === 'string' && payee.transfer_acct)
        .map((payee) => [payee.transfer_acct as string, payee.id]),
    );
    const reservedTransactionIds = new Set<string>();
    const results: HistoricalTransferApplyCandidateResult[] = [];

    // Pre-fetch all involved transactions in one batch
    const allCandidateTransactionIds = uniqueCandidateIds.flatMap((cid) => {
      try {
        return parseHistoricalTransferCandidateId(cid);
      } catch {
        return [];
      }
    });

    const allInvolvedTransactions = await getBatchHistoricalTransferTransactions(
      db,
      allCandidateTransactionIds,
    );
    const transactionsById = new Map(allInvolvedTransactions.map((tx) => [tx.id, tx]));

    // Pre-fetch all potential counterparts for all involved transactions in one batch
    const allPotentialCounterparts = await getAllPotentialHistoricalTransferCounterparts(
      db,
      allInvolvedTransactions,
    );

    // Index counterparts by amount and date for efficient O(1) lookup
    const counterpartsByAmount = new Map<number, HistoricalTransferInternalTransaction[]>();
    for (const counterpart of allPotentialCounterparts) {
      const existing = counterpartsByAmount.get(counterpart.amount) ?? [];
      existing.push(counterpart);
      counterpartsByAmount.set(counterpart.amount, existing);
    }

    for (const candidateId of uniqueCandidateIds) {
      try {
        const [firstTransactionId, secondTransactionId] =
          parseHistoricalTransferCandidateId(candidateId);

        if (
          reservedTransactionIds.has(firstTransactionId) ||
          reservedTransactionIds.has(secondTransactionId)
        ) {
          results.push({
            candidateId,
            transactionIds: [firstTransactionId, secondTransactionId],
            status: 'rejected',
            reason: 'At least one transaction in this request appears in multiple candidate pairs.',
          });
          continue;
        }

        const firstTransaction = transactionsById.get(firstTransactionId);
        const secondTransaction = transactionsById.get(secondTransactionId);

        if (
          !isValidHistoricalTransferTransaction(firstTransaction ?? null) ||
          !isValidHistoricalTransferTransaction(secondTransaction ?? null)
        ) {
          results.push({
            candidateId,
            transactionIds: [firstTransactionId, secondTransactionId],
            status: 'rejected',
            reason:
              'One or both transactions are missing, already linked, split, deleted, or starting-balance entries.',
          });
          continue;
        }

        // TypeScript safety after isValidHistoricalTransferTransaction check
        const tx1 = firstTransaction!;
        const tx2 = secondTransaction!;

        if (tx1.account === tx2.account) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason: 'Historical transfer pairs must come from different accounts.',
          });
          continue;
        }

        if (tx1.amount !== tx2.amount * -1) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason: 'Historical transfer pairs must have exact inverse amounts.',
          });
          continue;
        }

        if (Math.abs(getDateDiffInDays(tx1.date, tx2.date)) > 3) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason: 'Historical transfer pairs must fall within 3 days of each other.',
          });
          continue;
        }

        // Efficient in-memory counterpart lookup
        const findCounterparts = (tx: HistoricalTransferInternalTransaction) => {
          const inverseAmount = tx.amount * -1;
          const matches = counterpartsByAmount.get(inverseAmount) ?? [];
          return matches
            .filter(
              (m) =>
                m.id !== tx.id &&
                m.account !== tx.account &&
                Math.abs(getDateDiffInDays(tx.date, m.date)) <= 3,
            )
            .map((m) => m.id);
        };

        const firstCounterpartIds = findCounterparts(tx1);
        const secondCounterpartIds = findCounterparts(tx2);

        if (
          firstCounterpartIds.length !== 1 ||
          firstCounterpartIds[0] !== tx2.id ||
          secondCounterpartIds.length !== 1 ||
          secondCounterpartIds[0] !== tx1.id
        ) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason:
              'This candidate no longer has a unique exact inverse counterpart, so it cannot be linked safely.',
          });
          continue;
        }

        const firstTransferPayeeId = transferPayeeByAccountId.get(tx2.account);
        const secondTransferPayeeId = transferPayeeByAccountId.get(tx1.account);

        if (!firstTransferPayeeId || !secondTransferPayeeId) {
          results.push({
            candidateId,
            transactionIds: [tx1.id, tx2.id],
            status: 'rejected',
            reason: 'A required transfer payee was not found for one of the accounts in this pair.',
          });
          continue;
        }

        const firstAccount = accountsById.get(tx1.account);
        const secondAccount = accountsById.get(tx2.account);
        const categoriesCleared =
          Boolean(firstAccount?.offbudget) === Boolean(secondAccount?.offbudget);

        await send('transactions-batch-update', {
          updated: [
            {
              id: tx1.id,
              payee: firstTransferPayeeId,
              transfer_id: tx2.id,
              ...(categoriesCleared ? { category: null } : {}),
            },
            {
              id: tx2.id,
              payee: secondTransferPayeeId,
              transfer_id: tx1.id,
              ...(categoriesCleared ? { category: null } : {}),
            },
          ],
          runTransfers: false,
        });

        reservedTransactionIds.add(tx1.id);
        reservedTransactionIds.add(tx2.id);
        results.push({
          candidateId,
          transactionIds: [tx1.id, tx2.id],
          status: 'applied',
          categoriesCleared,
        });
      } catch (error) {
        results.push({
          candidateId,
          transactionIds: (() => {
            try {
              const [firstTransactionId, secondTransactionId] =
                parseHistoricalTransferCandidateId(candidateId);
              return [firstTransactionId, secondTransactionId] as [string, string];
            } catch {
              return [candidateId, candidateId];
            }
          })(),
          status: 'rejected',
          reason: error instanceof Error ? error.message : String(error ?? 'unknown error'),
        });
      }
    }

    if (results.some((result) => result.status === 'applied')) {
      cacheService.invalidatePattern('transactions:*');
      cacheService.invalidate('accounts:all');
      invalidateNameResolutionState();
    }

    return {
      requestedCandidateCount: uniqueCandidateIds.length,
      appliedCount: results.filter((result) => result.status === 'applied').length,
      rejectedCount: results.filter((result) => result.status === 'rejected').length,
      results,
    };
  }, 'write');
}

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

/**
 * Get all schedules (ensures API is initialized)
 */
export async function getSchedules(): Promise<APIScheduleEntity[]> {
  return runReadOperation(async () => {
    return (await extendedApi.getSchedules?.()) ?? [];
  });
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

/**
 * Get rules for a specific payee (ensures API is initialized)
 */
export async function getPayeeRules(payeeId: string): Promise<RuleEntity[]> {
  return runReadOperation(() => api.getPayeeRules(payeeId));
}

/**
 * Get all budgets (ensures API is initialized)
 */
export async function getBudgets(): Promise<BudgetFile[]> {
  return runReadOperation(() => api.getBudgets());
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

/**
 * Sync with the server (ensures API is initialized)
 */
export async function sync(): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.sync === 'function') {
      const result = await api.sync();
      markSyncSuccess();
      invalidateAllReadState();
      return result;
    }
    throw new Error('sync method is not available in this version of the API');
  }, 'write');
}

/**
 * Run bank sync (ensures API is initialized)
 */
export async function runBankSync(accountId?: string): Promise<unknown> {
  return ensureConnection(async () => {
    if (extendedApi.runBankSync) {
      const result = await extendedApi.runBankSync(accountId ? { accountId } : undefined);
      markSyncSuccess();
      invalidateAllReadState();
      return result;
    }
    throw new Error('runBankSync method is not available in this version of the API');
  }, 'write');
}

/**
 * Run import (ensures API is initialized)
 */
export async function runImport(
  budgetName: string,
  callback: () => Promise<void>,
): Promise<unknown> {
  return ensureConnection(async () => {
    if (typeof api.runImport === 'function') {
      const result = await api.runImport(budgetName, callback);
      markSyncSuccess();
      invalidateAllReadState();
      return result;
    }
    throw new Error('runImport method is not available in this version of the API');
  }, 'write');
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
 * Run an AQL query (ensures API is initialized)
 */
export async function runAQL(query: unknown): Promise<unknown> {
  return runReadOperation(async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Workaround for type mismatch in actual-app/api
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return api.runQuery(query as any);
  });
}

/**
 * Run an ActualQL query (ensures API is initialized)
 */
export async function runQuery(query: string): Promise<unknown> {
  return runReadOperation(async () => {
    if (typeof api.runQuery === 'function') {
      // * API signature changed - runQuery now takes query string directly or different format
      // Cast through unknown to handle API signature mismatch (Query type vs string)
      return (api.runQuery as unknown as (q: string) => Promise<unknown>)(query);
    }
    throw new Error('runQuery method is not available in this version of the API');
  });
}

/**
 * Get server version (ensures API is initialized)
 */
export async function getServerVersion(): Promise<{ error?: string } | { version: string }> {
  return runReadOperation(async () => {
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
  return runReadOperation(async () => {
    if (extendedApi.getIDByName) {
      return extendedApi.getIDByName({ type, string: name });
    }
    throw new Error('getIDByName method is not available in this version of the API');
  });
}
