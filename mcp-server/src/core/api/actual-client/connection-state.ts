/**
 * Connection state management for the Actual Budget API client.
 *
 * Owns all mutable connection state, constants, and state-mutation helpers.
 * Other connection modules (`connection-lifecycle`, `connection-guard`) import
 * from here — this module has **no** dependency on them.
 */
import os from 'node:os';
import path from 'node:path';
import type {
  ActualConnectionState,
  ActualReadFreshnessMode,
  ActualReadinessStatus,
} from './types.js';
import { serializeUnknownError } from '../../utils/error-serialization.js';

// ── Constants ──────────────────────────────────────────────────────────────────

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

const CONNECTION_ERROR_KEYWORDS = [
  'not connected',
  'connection',
  'econnrefused',
  'network',
  'timeout',
  'unknown operator',
  'no budget file is open',
  'budget file',
];

export const MAX_RETRY_ATTEMPTS = 5;
export const BASE_RETRY_DELAY_MS = 10000; // 10 seconds

// ── Shared mutable state ───────────────────────────────────────────────────────

/**
 * Centralized mutable store shared across connection modules.
 * Exported so `connection-lifecycle` and `connection-guard` can read/write.
 */
export const store = {
  initialized: false,
  initializationError: null as Error | null,
  /** Serializes init/reconnect/shutdown so concurrent callers cannot interleave or race on shared API state. */
  initMutexChain: Promise.resolve() as Promise<void>,
  connectionState: { ...INITIAL_CONNECTION_STATE } as ActualConnectionState,
  /** Last confirmed healthy interaction with `@actual-app/api` (init, health probe, or successful operation). */
  lastHealthyAt: 0,
  /** Dedup concurrent `checkConnectionHealth` calls so callers never mistakenly treat "check in flight" as "healthy". */
  pendingHealthCheck: null as Promise<boolean> | null,
  initializationTime: null as number | null,
  initializationSkipCount: 0,
  /** Increments each time `markConnectionReady` runs (successful ready epochs). */
  budgetReadyEpochCount: 0,
  /** Counts `initActualApi(true)` runs that entered the serialized init body (forced reconnect path). */
  forcedInitInvocationCount: 0,
  autoSyncInterval: null as NodeJS.Timeout | null,
  backgroundRetryTimer: null as NodeJS.Timeout | null,
  connectionDiagnosticsInterval: null as NodeJS.Timeout | null,
};

// ── Pure helpers ───────────────────────────────────────────────────────────────

export function nowAsIsoString(): string {
  return new Date().toISOString();
}

export function getReadFreshnessMode(): ActualReadFreshnessMode {
  return process.env.ACTUAL_READ_FRESHNESS_MODE === 'strict-live'
    ? 'strict-live'
    : DEFAULT_READ_FRESHNESS_MODE;
}

export function isStrictLiveReadMode(): boolean {
  return getReadFreshnessMode() === 'strict-live';
}

/** Bounded 3s–300s. Controls how often read paths probe with `checkConnectionHealth` when idle. */
export function getConnectionHealthTtlMs(): number {
  const raw = Number.parseInt(process.env.ACTUAL_CONNECTION_HEALTH_TTL_MS || '20000', 10);
  if (Number.isNaN(raw)) {
    return 20000;
  }
  return Math.min(Math.max(raw, 3000), 300_000);
}

export function sanitizeConnectionError(error: unknown): string {
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

// ── State mutation helpers ─────────────────────────────────────────────────────

function updateConnectionState(patch: Partial<ActualConnectionState>): void {
  store.connectionState = {
    ...store.connectionState,
    ...patch,
  };
}

export function markConnectionInitializing(): void {
  updateConnectionState({
    status: 'initializing',
    lastError: null,
    lastErrorAt: null,
  });
}

export function markConnectionReady(budgetId: string): void {
  store.budgetReadyEpochCount++;
  store.initialized = true;
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

export function markConnectionError(error: unknown): void {
  store.initialized = false;
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

export function bumpHealthyTimestamp(): void {
  store.lastHealthyAt = Date.now();
}

export function resetConnectionState(): void {
  store.connectionState = { ...INITIAL_CONNECTION_STATE };
}

// ── State query helpers ────────────────────────────────────────────────────────

export function getConnectionState(): ActualConnectionState {
  return { ...store.connectionState };
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

/**
 * Check if the API is currently initialized
 */
export function isInitialized(): boolean {
  return store.initialized;
}

/**
 * Check if the API is currently initializing
 */
export function isInitializing(): boolean {
  return store.connectionState.status === 'initializing';
}

/**
 * Get initialization performance statistics
 */
export function getInitializationStats(): {
  initializationTime: number | null;
  skipCount: number;
  timeSaved: number;
} {
  const timeSaved = store.initializationTime
    ? store.initializationTime * store.initializationSkipCount
    : 0;
  return {
    initializationTime: store.initializationTime,
    skipCount: store.initializationSkipCount,
    timeSaved,
  };
}

/**
 * Reset initialization statistics (useful for testing)
 */
export function resetInitializationStats(): void {
  store.initializationSkipCount = 0;
  store.budgetReadyEpochCount = 0;
  store.forcedInitInvocationCount = 0;
}

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
