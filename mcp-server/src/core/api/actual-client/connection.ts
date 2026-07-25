import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import '../../../polyfill.js';
import api from '@actual-app/api';
import type {
  ActualConnectionState,
  ActualReadFreshnessMode,
  ActualReadinessStatus,
  ActualReadinessStatusExtended,
} from './types.js';
import { validateActualAuthStartupConfig } from '../../auth/startup-guard.js';
import { cacheService } from '../../cache/cache-service.js';
import type { BudgetFile } from '../../types/index.js';
import { getBudgetDownloadIdentifier, matchesBudgetIdentifier } from './budget-resolution.js';
import { invalidateAllReadState } from './cache-helpers.js';
import { normalizeUnknownError, serializeUnknownError } from '../../utils/error-serialization.js';

export const DEFAULT_DATA_DIR: string = path.resolve(os.homedir() || '.', '.actual');
const DEFAULT_READ_FRESHNESS_MODE = 'cached';

const INITIAL_CONNECTION_STATE: ActualConnectionState = {
  status: 'disconnected',
  lastReadyAt: null,
  lastSyncAt: null,
  lastError: null,
  lastErrorAt: null,
  debugError: null,
  activeBudgetId: null,
};

// API initialization state
let initialized = false;
let initializationError: Error | null = null;
/** Serializes init/reconnect/shutdown so concurrent callers cannot interleave or race on shared API state. */
let initMutexChain: Promise<void> = Promise.resolve();
let connectionState: ActualConnectionState = { ...INITIAL_CONNECTION_STATE };

/** Bounded 3s–300s. Controls how often read paths probe with `checkConnectionHealth` when idle. */
function getConnectionHealthTtlMs(): number {
  const raw = Number.parseInt(process.env.ACTUAL_CONNECTION_HEALTH_TTL_MS || '20000', 10);
  if (Number.isNaN(raw)) {
    return 20000;
  }
  return Math.min(Math.max(raw, 3000), 300_000);
}

/** Last confirmed healthy interaction with `@actual-app/api` (init, health probe, or successful operation). */
let lastHealthyAt = 0;

/** Dedup concurrent `checkConnectionHealth` calls so callers never mistakenly treat "check in flight" as "healthy". */
let pendingHealthCheck: Promise<boolean> | null = null;

function bumpHealthyTimestamp(): void {
  lastHealthyAt = Date.now();
}

// Performance tracking for initialization
let initializationTime: number | null = null;
let initializationSkipCount = 0;

/** Increments each time `markConnectionReady` runs (successful ready epochs). */
let budgetReadyEpochCount = 0;

/** Counts `initActualApi(true)` runs that entered the serialized init body (forced reconnect path). */
let forcedInitInvocationCount = 0;

// Auto-sync state
let autoSyncInterval: NodeJS.Timeout | null = null;

// Background retry state
let backgroundRetryTimer: NodeJS.Timeout | null = null;
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 10000; // 10 seconds

let connectionDiagnosticsInterval: NodeJS.Timeout | null = null;

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
    lastErrorAt: null,
  });
}

export function markConnectionReady(budgetId: string): void {
  budgetReadyEpochCount++;
  initialized = true;
  bumpHealthyTimestamp();
  updateConnectionState({
    status: 'ready',
    lastReadyAt: nowAsIsoString(),
    lastError: null,
    lastErrorAt: null,
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
    lastErrorAt: nowAsIsoString(),
    debugError: rawMessage,
  });
}

export function markSyncSuccess(): void {
  updateConnectionState({
    lastSyncAt: nowAsIsoString(),
    lastError: null,
    lastErrorAt: null,
  });
}

async function settlePendingHealthCheck(): Promise<void> {
  if (!pendingHealthCheck) {
    return;
  }
  const inflight = pendingHealthCheck;
  try {
    await inflight;
  } catch {
    // Ignore; teardown or the next init will replace the session.
  }
}

/**
 * Fully tear down the `@actual-app/api` session and local caches. Always call this before a second
 * `api.init()` — re-initializing without `shutdown()` leaves the client in a broken state on many versions.
 */
async function disposeActualBudgetSession(reason: string): Promise<void> {
  await settlePendingHealthCheck();

  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }

  if (backgroundRetryTimer) {
    clearTimeout(backgroundRetryTimer);
    backgroundRetryTimer = null;
  }

  initialized = false;
  lastHealthyAt = 0;

  try {
    await api.shutdown();
  } catch (error) {
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.warn(
        `[CONNECTION] api.shutdown during dispose (${reason}): ${serializeUnknownError(error)}`,
      );
    }
  }

  try {
    invalidateAllReadState();
  } catch (error) {
    if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.warn(
        `[CONNECTION] cache clear during dispose (${reason}): ${serializeUnknownError(error)}`,
      );
    }
  }

  connectionState = { ...INITIAL_CONNECTION_STATE };
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

export async function runReadOperation<T>(
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

  if (pendingHealthCheck) {
    return pendingHealthCheck;
  }

  pendingHealthCheck = (async (): Promise<boolean> => {
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await api.getAccounts();
          bumpHealthyTimestamp();
          return true;
        } catch (error) {
          const msg = normalizeUnknownError(error).message.toLowerCase();
          const maybeOpening = msg.includes('no budget file is open') && attempt < 2;
          if (!maybeOpening) {
            throw error;
          }
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 100);
          });
        }
      }
      // Not reachable at runtime (loop returns true or throws); satisfies TS exhaustiveness.
      return false;
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
        errorStr.includes('no budget file is open') ||
        errorStr.includes('budget file')
      ) {
        if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
          console.error(
            `[CONNECTION] Health check failed - connection lost or budget closed: ${errorMessage}`,
          );
        }
        markConnectionError(normalizedError);
        return false;
      }

      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        console.error(
          `[CONNECTION] Health check encountered a non-connection error but kept readiness: ${errorMessage}`,
        );
      }

      return true;
    } finally {
      pendingHealthCheck = null;
    }
  })();

  return pendingHealthCheck;
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

  // Support both legacy and current encryption env var names during migration windows.
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
 * Handle initialization errors, including actionable guidance for migration-state failures.
 * @param error - The error that occurred
 */
function handleInitializationError(error: unknown): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStr = errorMessage.toLowerCase();

  // Detect migration-state failures from common Actual server error text variants.
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
    if ('cause' in error && error.cause !== undefined && error.cause !== null) {
      console.error('  Cause:', serializeUnknownError(error.cause));
    }
  } else {
    console.error('Failed to initialize Actual Budget API:', serializeUnknownError(error));
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
    if (forceReconnect) {
      forcedInitInvocationCount++;
    }

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

    const shouldDispose = initialized || forceReconnect || connectionState.status === 'error';
    if (shouldDispose) {
      await disposeActualBudgetSession(
        forceReconnect ? 'before_force_reconnect' : 'before_reinit_after_error_or_existing_session',
      );
    }

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
 * MCP tool entry fast path: when the budget session is ready, avoid mutex/enqueue overhead from
 * {@link initActualApi}. Individual tool handlers still use `ensureConnection` for staleness and retries.
 */
export async function ensureBudgetReadyForTools(): Promise<void> {
  if (initialized && connectionState.status === 'ready') {
    return;
  }

  await initActualApi(shouldForceInitReconnect());
}

/**
 * Emit periodic `[MCP_DIAG]` lines when `MCP_CONNECTION_DIAGNOSTICS_INTERVAL_SEC` is a positive integer.
 * Intended for correlating reconnect issues with RSS on constrained hosts without full APM.
 */
export function scheduleConnectionDiagnosticsIfEnabled(): void {
  if (connectionDiagnosticsInterval) {
    return;
  }

  const parsed = Number.parseInt(process.env.MCP_CONNECTION_DIAGNOSTICS_INTERVAL_SEC ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return;
  }

  connectionDiagnosticsInterval = setInterval(() => {
    const memory = process.memoryUsage();
    const state = getConnectionState();
    const budgetTail =
      typeof state.activeBudgetId === 'string' && state.activeBudgetId.length > 8
        ? state.activeBudgetId.slice(-8)
        : (state.activeBudgetId ?? 'none');

    console.error(
      `[MCP_DIAG] conn=${state.status} budget_tail=${budgetTail} rss_mb=${Math.round(memory.rss / (1024 * 1024))} ready_epochs=${budgetReadyEpochCount} forced_inits=${forcedInitInvocationCount} init_skips=${initializationSkipCount}`,
    );
  }, parsed * 1000);

  connectionDiagnosticsInterval.unref?.();
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
    const base = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), 120_000);
    const isRateLimited = initializationError?.message?.toLowerCase().includes('too-many-requests');
    const delay = isRateLimited ? Math.max(base, 120_000) : base;
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
  if (connectionDiagnosticsInterval) {
    clearInterval(connectionDiagnosticsInterval);
    connectionDiagnosticsInterval = null;
  }

  await enqueueInit(async () => {
    await disposeActualBudgetSession('explicit_shutdown');
    initializationError = null;
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
  budgetReadyEpochCount = 0;
  forcedInitInvocationCount = 0;
}

export function getConnectionState(): ActualConnectionState {
  return { ...connectionState };
}

/**
 * Cheap synchronous readiness snapshot (no `getAccounts` health probe).
 * Matches {@link getReadinessStatus}(false) after any optional forced check in that API.
 */
export function getReadinessSnapshot(): ActualReadinessStatus {
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

  return {
    ...snapshot,
    ready: snapshot.status === 'ready' && Boolean(snapshot.activeBudgetId),
    reason,
  };
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

  const base = getReadinessSnapshot();

  if (forceCheck) {
    let serverHostname: string | null = null;
    if (process.env.ACTUAL_SERVER_URL) {
      try {
        serverHostname = new URL(process.env.ACTUAL_SERVER_URL).hostname;
      } catch {
        serverHostname = '(invalid URL)';
      }
    }

    return {
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
  }

  return base;
}

const CONNECTION_ERROR_KEYWORDS = [
  'not connected',
  'connection',
  'econnrefused',
  'network',
  'timeout',
  'unknown operator', // Some API errors indicate connection issues
  'no budget file is open', // Budget was closed or lost
  'budget file', // Catch other budget-related errors
];

/**
 * Check if error is a connection error
 * @param errorMessage - Lowercase error message
 * @returns True if it's a connection error
 */
export function isConnectionError(errorMessage: string): boolean {
  if (errorMessage.includes('too-many-requests')) {
    return false;
  }
  return CONNECTION_ERROR_KEYWORDS.some((keyword) => errorMessage.includes(keyword));
}

/** True when `initActualApi(false)` fast-path must not run (`initialized && !force` skips real work). */
function shouldForceInitReconnect(): boolean {
  return (
    connectionState.status === 'error' ||
    initializationError !== null ||
    (initialized && connectionState.status !== 'ready')
  );
}

async function ensureReadConnectionAvailable(): Promise<void> {
  if (initialized && connectionState.status === 'ready') {
    return;
  }

  await initActualApi(shouldForceInitReconnect());
}

/**
 * Cached read paths bypass `ensureWriteConnectionAvailable()`, so readiness can look "fine" until the API is
 * actually touched. Probe occasionally and reconnect before reads when the budget has gone quiet longer than TTL.
 */
async function reconnectStaleBudgetBeforeRead(reason: string): Promise<void> {
  if (!initialized || connectionState.status !== 'ready') {
    return;
  }

  const ttlMs = getConnectionHealthTtlMs();
  if (Date.now() - lastHealthyAt < ttlMs) {
    return;
  }

  if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
    console.error(`[CONNECTION] Read-time health probe (${reason}, ttlMs=${String(ttlMs)})`);
  }

  const healthy = await checkConnectionHealth();
  if (!healthy) {
    await initActualApi(true);
  }
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

export async function ensureConnection<T>(
  operation: () => Promise<T>,
  mode: ConnectionMode = 'read',
): Promise<T> {
  if (mode === 'write') {
    await ensureWriteConnectionAvailable();
    try {
      const result = await operation();
      bumpHealthyTimestamp();
      return result;
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
      await reconnectStaleBudgetBeforeRead(`read_attempt_${attempt + 1}`);
      const result = await operation();
      bumpHealthyTimestamp();
      return result;
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

/**
 * Sync with the server (ensures API is initialized)
 *
 * Lives in the connection module because the engine itself depends on it
 * (strict-live reads and the auto-sync interval).
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
