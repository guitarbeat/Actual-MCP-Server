/**
 * Connection guards, retry wrappers, and readiness probing for the Actual Budget API client.
 *
 * This module provides the central `ensureConnection` wrapper that every API
 * operation flows through, plus `runReadOperation`, `sync`, and the full
 * readiness status query.
 *
 * Dependency order: `connection-state` → `connection-lifecycle` → **this file**.
 * Neither of the two upstream modules imports from here, so the graph is acyclic.
 */
import '../../../polyfill.js';
import api from '@actual-app/api';
import type {
  ActualReadinessStatus,
  ActualReadinessStatusExtended,
} from './types.js';
import { cacheService } from '../../cache/cache-service.js';
import { normalizeUnknownError, serializeUnknownError } from '../../utils/error-serialization.js';
import { invalidateAllReadState } from './cache-helpers.js';
import {
  bumpHealthyTimestamp,
  getConnectionHealthTtlMs,
  getConnectionState,
  getReadFreshnessMode,
  getReadinessSnapshot,
  isConnectionError,
  isStrictLiveReadMode,
  markConnectionError,
  markSyncSuccess,
  store,
} from './connection-state.js';
import {
  checkConnectionHealth,
  initActualApi,
  shouldForceInitReconnect,
} from './connection-lifecycle.js';

// ── Guards ─────────────────────────────────────────────────────────────────────

async function ensureReadConnectionAvailable(): Promise<void> {
  if (store.initialized && store.connectionState.status === 'ready') {
    return;
  }

  await initActualApi(shouldForceInitReconnect());
}

/**
 * Cached read paths bypass `ensureWriteConnectionAvailable()`, so readiness can look "fine" until the API is
 * actually touched. Probe occasionally and reconnect before reads when the budget has gone quiet longer than TTL.
 */
async function reconnectStaleBudgetBeforeRead(reason: string): Promise<void> {
  if (!store.initialized || store.connectionState.status !== 'ready') {
    return;
  }

  const ttlMs = getConnectionHealthTtlMs();
  if (Date.now() - store.lastHealthyAt < ttlMs) {
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
  if (!store.initialized || store.connectionState.status !== 'ready') {
    await initActualApi(
      store.connectionState.status === 'error' || store.initializationError !== null,
    );
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

// ── Sync & read wrappers ───────────────────────────────────────────────────────

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

/**
 * Sync with the server (ensures API is initialized)
 *
 * Lives in the guard module because it wraps with `ensureConnection`
 * and is consumed by the read/write wrappers.
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

// ── Readiness status ───────────────────────────────────────────────────────────

export async function getReadinessStatus(forceCheck?: false): Promise<ActualReadinessStatus>;
export async function getReadinessStatus(forceCheck: true): Promise<ActualReadinessStatusExtended>;
export async function getReadinessStatus(
  forceCheck = false,
): Promise<ActualReadinessStatus | ActualReadinessStatusExtended> {
  if (forceCheck && store.initialized && store.connectionState.status === 'ready') {
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
        retrying: store.backgroundRetryTimer !== null,
      },
    };
  }

  return base;
}
