/**
 * Connection lifecycle management for the Actual Budget API client.
 *
 * Handles initialization, shutdown, health checks, background retries,
 * auto-sync scheduling, and diagnostics.
 *
 * Depends on `connection-state` for mutable state. Does **not** import from
 * `connection-guard`; that module registers the guarded sync operation used
 * by the auto-sync scheduler, keeping the dependency graph acyclic.
 */
import fs from 'node:fs';
import '../../../polyfill.js';
import api from '@actual-app/api';
import type { BudgetFile } from '../../types/index.js';
import { validateActualAuthStartupConfig } from '../../auth/startup-guard.js';
import { normalizeUnknownError, serializeUnknownError } from '../../utils/error-serialization.js';
import { getBudgetDownloadIdentifier, matchesBudgetIdentifier } from './budget-resolution.js';
import { invalidateAllReadState } from './cache-helpers.js';
import {
  BASE_RETRY_DELAY_MS,
  DEFAULT_DATA_DIR,
  MAX_RETRY_ATTEMPTS,
  bumpHealthyTimestamp,
  getConnectionState,
  getReadFreshnessMode,
  isInitialized,
  markConnectionError,
  markConnectionInitializing,
  markConnectionReady,
  markSyncSuccess,
  store,
} from './connection-state.js';

// ── Init serialization ─────────────────────────────────────────────────────────

function enqueueInit<T>(work: () => Promise<T>, timeoutMs = 55000): Promise<T> {
  const next = store.initMutexChain.then(() => {
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
  store.initMutexChain = next.then(
    () => {},
    () => {},
  );
  return next;
}

// ── Health checks ──────────────────────────────────────────────────────────────

export async function settlePendingHealthCheck(): Promise<void> {
  if (!store.pendingHealthCheck) {
    return;
  }
  const inflight = store.pendingHealthCheck;
  try {
    await inflight;
  } catch {
    // Ignore; teardown or the next init will replace the session.
  }
}

/**
 * Check if the Actual Budget API connection is healthy
 * @returns true if connection is healthy, false otherwise
 */
export async function checkConnectionHealth(): Promise<boolean> {
  if (!store.initialized || store.connectionState.status !== 'ready') {
    return false;
  }

  if (store.pendingHealthCheck) {
    return store.pendingHealthCheck;
  }

  store.pendingHealthCheck = (async (): Promise<boolean> => {
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
      store.pendingHealthCheck = null;
    }
  })();

  return store.pendingHealthCheck;
}

// ── Session disposal ───────────────────────────────────────────────────────────

/**
 * Fully tear down the `@actual-app/api` session and local caches. Always call this before a second
 * `api.init()` — re-initializing without `shutdown()` leaves the client in a broken state on many versions.
 */
async function disposeActualBudgetSession(reason: string): Promise<void> {
  await settlePendingHealthCheck();

  if (store.autoSyncInterval) {
    clearInterval(store.autoSyncInterval);
    store.autoSyncInterval = null;
  }

  if (store.backgroundRetryTimer) {
    clearTimeout(store.backgroundRetryTimer);
    store.backgroundRetryTimer = null;
  }

  store.initialized = false;
  store.lastHealthyAt = 0;

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

  store.connectionState = {
    status: 'disconnected',
    lastReadyAt: null,
    lastSyncAt: null,
    lastError: null,
    lastErrorAt: null,
    debugError: null,
    activeBudgetId: null,
  };
}

// ── Low-level init helpers ─────────────────────────────────────────────────────

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
  store.initializationTime = Date.now() - startTime;
  if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
    console.error(`[PERF] API initialized in ${store.initializationTime}ms`);
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

  store.initializationError = error instanceof Error ? error : new Error(String(error));
  markConnectionError(store.initializationError);
  throw store.initializationError;
}

// ── Auto-sync ──────────────────────────────────────────────────────────────────

type AutoSyncOperation = () => Promise<unknown>;
let autoSyncOperation: AutoSyncOperation | null = null;

/** Register the guarded sync operation without introducing a lifecycle → guard cycle. */
export function registerAutoSyncOperation(operation: AutoSyncOperation): void {
  autoSyncOperation = operation;
}

/**
 * Setup automatic budget sync on an interval.
 *
 * Uses the guarded sync operation registered by `connection-guard`, preserving
 * health checks, reconnect behavior, readiness updates, and cache invalidation.
 */
function setupAutoSync(): void {
  // Clear any existing interval
  if (store.autoSyncInterval) {
    clearInterval(store.autoSyncInterval);
    store.autoSyncInterval = null;
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
  store.autoSyncInterval = setInterval(async () => {
    try {
      if (!autoSyncOperation) {
        throw new Error('Guarded auto-sync operation has not been registered');
      }
      await autoSyncOperation();
      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        console.error('[AUTO-SYNC] Budget synced successfully');
      }
    } catch (error) {
      console.error('[AUTO-SYNC] Failed to sync budget:', error);
    }
  }, intervalMs);

  console.error(`[AUTO-SYNC] Enabled: every ${minutes} minute${minutes !== 1 ? 's' : ''}`);
}

// ── Public lifecycle API ───────────────────────────────────────────────────────

/** True when `initActualApi(false)` fast-path must not run (`initialized && !force` skips real work). */
export function shouldForceInitReconnect(): boolean {
  return (
    store.connectionState.status === 'error' ||
    store.initializationError !== null ||
    (store.initialized && store.connectionState.status !== 'ready')
  );
}

/**
 * Initialize the Actual Budget API
 * @param forceReconnect - If true, force reconnection even if already initialized
 */
export async function initActualApi(forceReconnect = false): Promise<void> {
  return enqueueInit(async () => {
    if (forceReconnect) {
      store.forcedInitInvocationCount++;
    }

    if (store.initialized && !forceReconnect) {
      store.initializationSkipCount++;
      if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
        const timeSaved = store.initializationTime || 600;
        console.error(
          `[PERF] Initialization skipped (persistent connection) - saved ~${timeSaved}ms (skip count: ${store.initializationSkipCount})`,
        );
      }
      return;
    }

    if (forceReconnect && process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
      console.error('[CONNECTION] Forcing reconnection...');
    }

    store.initializationError = null;

    const shouldDispose =
      store.initialized || forceReconnect || store.connectionState.status === 'error';
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
  if (store.initialized && store.connectionState.status === 'ready') {
    return;
  }

  await initActualApi(shouldForceInitReconnect());
}

/**
 * Shutdown the Actual Budget API
 */
export async function shutdownActualApi(): Promise<void> {
  if (store.connectionDiagnosticsInterval) {
    clearInterval(store.connectionDiagnosticsInterval);
    store.connectionDiagnosticsInterval = null;
  }

  await enqueueInit(async () => {
    await disposeActualBudgetSession('explicit_shutdown');
    store.initializationError = null;
  });
}

/**
 * Emit periodic `[MCP_DIAG]` lines when `MCP_CONNECTION_DIAGNOSTICS_INTERVAL_SEC` is a positive integer.
 * Intended for correlating reconnect issues with RSS on constrained hosts without full APM.
 */
export function scheduleConnectionDiagnosticsIfEnabled(): void {
  if (store.connectionDiagnosticsInterval) {
    return;
  }

  const parsed = Number.parseInt(process.env.MCP_CONNECTION_DIAGNOSTICS_INTERVAL_SEC ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return;
  }

  store.connectionDiagnosticsInterval = setInterval(() => {
    const memory = process.memoryUsage();
    const state = getConnectionState();
    const budgetTail =
      typeof state.activeBudgetId === 'string' && state.activeBudgetId.length > 8
        ? state.activeBudgetId.slice(-8)
        : (state.activeBudgetId ?? 'none');

    console.error(
      `[MCP_DIAG] conn=${state.status} budget_tail=${budgetTail} rss_mb=${Math.round(memory.rss / (1024 * 1024))} ready_epochs=${store.budgetReadyEpochCount} forced_inits=${store.forcedInitInvocationCount} init_skips=${store.initializationSkipCount}`,
    );
  }, parsed * 1000);

  store.connectionDiagnosticsInterval.unref?.();
}

/**
 * Start background retry for automatic recovery after initialization failure
 */
export function startBackgroundRetry(): void {
  if (store.backgroundRetryTimer) return; // Already retrying

  let attempt = 0;
  const retry = async () => {
    if (store.initialized) {
      store.backgroundRetryTimer = null;
      return;
    }
    attempt++;
    const base = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), 120_000);
    const isRateLimited = store.initializationError?.message
      ?.toLowerCase()
      .includes('too-many-requests');
    const delay = isRateLimited ? Math.max(base, 120_000) : base;
    console.error(
      `[CONNECTION] Background retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} in ${Math.round(delay / 1000)}s...`,
    );

    store.backgroundRetryTimer = setTimeout(async () => {
      try {
        await initActualApi(true);
        console.error('[CONNECTION] Background retry succeeded');
        store.backgroundRetryTimer = null;
      } catch (error) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          retry();
        } else {
          console.error(
            `[CONNECTION] All ${MAX_RETRY_ATTEMPTS} retry attempts failed. Manual intervention required.`,
          );
          store.backgroundRetryTimer = null;
        }
      }
    }, delay);
  };

  retry();
}
