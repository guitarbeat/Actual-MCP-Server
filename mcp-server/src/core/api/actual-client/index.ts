/**
 * Actual Budget client public API.
 *
 * This module re-exports all public functions from the actual-client implementation.
 * Import from this module (actual-client/index.js) or from actual-client.js directly -
 * both are equivalent. The submodule path is provided so callers can use:
 *
 *   import { initActualApi } from '../api/actual-client/index.js';
 *
 * Sub-modules:
 *   - types.ts               - TypeScript interfaces for connection state and API entities
 *   - connection-state.ts    - Mutable connection state and state helpers
 *   - connection-lifecycle.ts - Init, shutdown, health checks, retries
 *   - connection-guard.ts    - Connection guards, ensureConnection wrapper, sync
 *   - api-accounts.ts        - Account CRUD operations
 *   - api-transactions.ts    - Transaction CRUD and historical transfers
 *   - api-categories.ts      - Category and category group operations
 *   - api-payees.ts          - Payee operations
 *   - api-budget.ts          - Budget month and budget file operations
 *   - api-rules-tags.ts      - Rule and tag operations
 *   - api-schedules.ts       - Schedule operations
 *   - api-misc.ts            - Sync, queries, server info, and utilities
 *   - budget-resolution.ts   - Budget file lookup and resolution helpers
 *   - cache-helpers.ts       - Invalidation helpers for name-resolver caches
 *   - historical-transfers.ts - Historical transfer detection logic
 */

export * from '../actual-client.js';
