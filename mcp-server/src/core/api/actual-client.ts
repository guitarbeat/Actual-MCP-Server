/**
 * Actual Budget API client.
 *
 * This module is a thin re-export barrel kept for backward compatibility — every
 * existing `import { ... } from '.../core/api/actual-client.js'` keeps working.
 * The implementation is split across focused modules in `actual-client/`:
 *
 * Connection layer:
 *   - `connection-state.ts`     — mutable state, constants, state helpers
 *   - `connection-lifecycle.ts` — init, shutdown, health checks, retries, auto-sync
 *   - `connection-guard.ts`     — ensureConnection wrapper, sync, readiness status
 *
 * Domain API modules:
 *   - `api-accounts.ts`      — account CRUD
 *   - `api-transactions.ts`  — transaction CRUD and historical transfers
 *   - `api-categories.ts`    — category and category group operations
 *   - `api-payees.ts`        — payee operations
 *   - `api-budget.ts`        — budget month and budget file operations
 *   - `api-rules-tags.ts`    — rule and tag operations
 *   - `api-schedules.ts`     — schedule operations
 *   - `api-misc.ts`          — bank sync, queries, server info, utilities
 */

export type {
  ActualConnectionState,
  ActualConnectionStatus,
  ActualReadFreshnessMode,
  ActualReadinessStatus,
  ActualReadinessStatusExtended,
  HistoricalTransferApplyResult,
  HistoricalTransferInternalTransaction,
} from './actual-client/types.js';

export {
  DEFAULT_DATA_DIR,
  getConnectionState,
  getInitializationStats,
  getReadinessSnapshot,
  isConnectionError,
  isInitialized,
  isInitializing,
  markConnectionReady,
  markSyncSuccess,
  resetInitializationStats,
} from './actual-client/connection-state.js';
export {
  ensureBudgetReadyForTools,
  initActualApi,
  scheduleConnectionDiagnosticsIfEnabled,
  shutdownActualApi,
  startBackgroundRetry,
} from './actual-client/connection-lifecycle.js';
export {
  ensureConnection,
  getReadinessStatus,
  runReadOperation,
  sync,
} from './actual-client/connection-guard.js';
export * from './actual-client/api-accounts.js';
export * from './actual-client/api-transactions.js';
export * from './actual-client/api-categories.js';
export * from './actual-client/api-payees.js';
export * from './actual-client/api-budget.js';
export * from './actual-client/api-rules-tags.js';
export * from './actual-client/api-schedules.js';
export * from './actual-client/api-misc.js';
