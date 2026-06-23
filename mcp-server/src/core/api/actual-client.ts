/**
 * Actual Budget API client.
 *
 * This module is a thin re-export barrel kept for backward compatibility — every
 * existing `import { ... } from '.../core/api/actual-client.js'` keeps working.
 * The implementation is split across:
 *
 * - `actual-client/connection.ts` — connection state machine, init/reconnect,
 *   health probing, auto-sync, retries, and the `ensureConnection`/`runReadOperation`
 *   wrappers (plus `sync()`, which the engine itself depends on).
 * - `actual-client/reads.ts` — read/fetch operations (cached where applicable).
 * - `actual-client/mutations.ts` — write operations and budget/session mutations.
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

export * from './actual-client/connection.js';
export * from './actual-client/reads.js';
export * from './actual-client/mutations.js';
