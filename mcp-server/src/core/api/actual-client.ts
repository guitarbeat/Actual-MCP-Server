import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import api from '@actual-app/api';
import type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
  APIScheduleEntity,
} from '@actual-app/api/@types/loot-core/src/server/api-models.js';
import type {
  RuleEntity,
  TransactionEntity,
} from '@actual-app/api/@types/loot-core/src/types/models/index.js';
import type { ImportTransactionsOpts } from '@actual-app/api/@types/methods.js';
import { cacheService } from '../cache/cache-service.js';
import type { BudgetFile } from '../types/index.js';
import { nameResolver } from '../utils/name-resolver.js';

type ExtendedActualApi = typeof api & {
  createSchedule?: (args: Record<string, unknown>) => Promise<string>;
  updateSchedule?: (id: string, args: Record<string, unknown>) => Promise<unknown>;
  deleteSchedule?: (id: string) => Promise<unknown>;
  getSchedules?: () => Promise<APIScheduleEntity[]>;
  runBankSync?: (options?: { accountId: string }) => Promise<unknown>;
  getServerVersion?: () => Promise<{ error?: string } | { version: string }>;
  getIDByName?: (args: { type: string; string: string }) => Promise<string>;
};

const extendedApi: ExtendedActualApi = api as ExtendedActualApi;

const DEFAULT_DATA_DIR: string = path.resolve(os.homedir() || '.', '.actual');
const DEFAULT_READ_FRESHNESS_MODE = 'cached';

export type ActualReadFreshnessMode = 'cached' | 'strict-live';

export type ActualConnectionStatus = 'disconnected' | 'initializing' | 'ready' | 'error';

export interface ActualConnectionState {
  status: ActualConnectionStatus;
  lastReadyAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  debugError: string | null;
  activeBudgetId: string | null;
}

export interface ActualReadinessStatus extends ActualConnectionState {
  ready: boolean;
  reason: string;
}

export interface ActualReadinessStatusExtended extends ActualReadinessStatus {
  diagnostics: {
    serverUrl: string | null;
    budgetSyncId: boolean;
    hasPassword: boolean;
    hasEncryptionPassword: boolean;
    autoSyncMinutes: string | null;
    readFreshnessMode: ActualReadFreshnessMode;
    retrying: boolean;
  };
}

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
let initializationPromise: Promise<void> | null = null;
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
  const errorMessage = error instanceof Error ? error.message : String(error ?? 'unknown error');
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
  const rawMessage = error instanceof Error ? error.message : String(error ?? 'unknown');
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

function invalidateAllReadState(): void {
  cacheService.clear();
  nameResolver.clearCache();
}

function invalidateNameResolutionState(): void {
  nameResolver.clearCache();
}

function createLiveSyncRequiredError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? 'unknown error');
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

async function waitForInitialization(timeoutMs = 55000): Promise<void> {
  if (!initializationPromise) {
    return;
  }

  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Initialization timed out after ${Math.floor(timeoutMs / 1000)} seconds`));
    }, timeoutMs);
  });

  try {
    await Promise.race([initializationPromise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
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
    const errorMessage = error instanceof Error ? error.message : String(error);
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
        console.error('[CONNECTION] Health check failed - connection lost or budget closed');
      }
      markConnectionError(error);
      return false;
    }

    // Other errors might be valid (e.g., no accounts), so assume connection is OK
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
  // * Removed JSON log to stdout - this was being interpreted as JSON-RPC in stdio mode
  // * Configuration details are logged via MCP logging if needed
  const config = {
    dataDir,
    serverURL: process.env.ACTUAL_SERVER_URL,
    password: process.env.ACTUAL_PASSWORD,
  };
  // biome-ignore lint/suspicious/noExplicitAny: API types mismatch with env vars
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await api.init(config as any);
}

function getBudgetIdentifiers(budget: BudgetFile): string[] {
  return [budget.groupId, budget.cloudFileId, budget.id].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}

function matchesBudgetIdentifier(budget: BudgetFile, identifier: string): boolean {
  return getBudgetIdentifiers(budget).includes(identifier);
}

function getBudgetDownloadIdentifier(budget: BudgetFile): string {
  return budget.groupId || budget.cloudFileId || budget.id || '';
}

function getBudgetLocalIdentifier(budget: BudgetFile): string | null {
  return typeof budget.id === 'string' && budget.id.length > 0 ? budget.id : null;
}

function describeBudgetIdentifiers(budget: BudgetFile): string {
  return getBudgetIdentifiers(budget).join(' | ');
}

async function loadBudgetByResolvedIdentifier(identifier: string): Promise<string> {
  const budgets: BudgetFile[] = await api.getBudgets();
  const matchingBudget = budgets.find((budget) => matchesBudgetIdentifier(budget, identifier));
  const loadableBudgetId = matchingBudget ? getBudgetLocalIdentifier(matchingBudget) : null;

  if (loadableBudgetId && typeof api.loadBudget === 'function') {
    await api.loadBudget(loadableBudgetId);
    return loadableBudgetId;
  }

  return identifier;
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
      const availableIds = budgets
        .map((b) => `${b.name || 'unnamed'} (${describeBudgetIdentifiers(b)})`)
        .join(', ');
      console.error(
        `[CONNECTION] ⚠️  ACTUAL_BUDGET_SYNC_ID="${specifiedId}" not found in budget list.`,
      );
      console.error(`[CONNECTION] Available budgets: ${availableIds}`);
      console.error(
        `[CONNECTION] Falling back to first budget: ${budgets[0].name || getBudgetDownloadIdentifier(budgets[0])}`,
      );
      // Fall back to first budget instead of failing
    }
  }

  // Use specified budget or the first one
  const budgetId: string = (() => {
    const sid = process.env.ACTUAL_BUDGET_SYNC_ID;
    if (sid) {
      const match = budgets.find((b) => matchesBudgetIdentifier(b, sid));
      if (match) return sid;
      console.error(`[CONNECTION] ACTUAL_BUDGET_SYNC_ID="${sid}" not found, using first budget`);
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
      '[CONNECTION] ⚠️  Encryption password provided but budget is not encrypted. Ignoring password.',
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
    console.error(`[PERF] 🔌 API initialized in ${initializationTime}ms`);
  }

  // Find the budget name for logging
  const loadedBudget = budgets.find((b) => matchesBudgetIdentifier(b, budgetId));
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
  if (initialized && !forceReconnect) {
    initializationSkipCount++;
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      const timeSaved = initializationTime || 600;
      console.error(
        `[PERF] ⚡ Initialization skipped (persistent connection) - saved ~${timeSaved}ms (skip count: ${initializationSkipCount})`,
      );
    }
    return;
  }

  if (initializationPromise) {
    await waitForInitialization();
    if (initializationError) {
      throw initializationError;
    }
    return;
  }

  if (forceReconnect && process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
    console.error('[CONNECTION] Forcing reconnection...');
  }

  initializationError = null;
  markConnectionInitializing();

  initializationPromise = (async () => {
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
    } finally {
      initializationPromise = null;
    }
  })();

  await waitForInitialization();
  if (initializationError) {
    throw initializationError;
  }
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
        console.error('[CONNECTION] ✅ Background retry succeeded!');
        backgroundRetryTimer = null;
      } catch (error) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          retry();
        } else {
          console.error(
            `[CONNECTION] ❌ All ${MAX_RETRY_ATTEMPTS} retry attempts failed. Manual intervention required.`,
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
        console.error(`[AUTO-SYNC] ✓ Budget synced successfully`);
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
  return initializationPromise !== null || connectionState.status === 'initializing';
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
  if (initializationPromise) {
    await waitForInitialization();
  }

  if (initialized && connectionState.status === 'ready') {
    return;
  }

  await initActualApi(connectionState.status === 'error' || initializationError !== null);
}

async function ensureWriteConnectionAvailable(): Promise<void> {
  if (initializationPromise) {
    await waitForInitialization();
  }

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
      const resolvedError = error instanceof Error ? error : new Error(String(error));
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
      lastError = error instanceof Error ? error : new Error(String(error));
      const shouldRetry =
        isConnectionError(lastError.message.toLowerCase()) && attempt < maxRetries;
      if (!shouldRetry) {
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
export async function closeAccount(id: string): Promise<unknown> {
  return ensureConnection(async () => {
    const result = await api.closeAccount(id);
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
export async function updateSchedule(id: string, args: Record<string, unknown>): Promise<unknown> {
  return ensureConnection(async () => {
    if (!extendedApi.updateSchedule) {
      throw new Error('updateSchedule method is not available in this version of the API');
    }
    return extendedApi.updateSchedule(id, args);
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

    const activeBudgetId = await loadBudgetByResolvedIdentifier(budgetId);
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
