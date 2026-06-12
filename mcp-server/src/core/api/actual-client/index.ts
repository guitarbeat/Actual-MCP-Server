/**
 * Actual Budget client public API.
 *
 * This module re-exports all public functions from the actual-client implementation.
 * Import from this module (actual-client/index.js) or from actual-client.js directly -
 * both are equivalent. The submodule path is provided so callers can use:
 *
 *   import { initActualApi } from '../api/actual-client/index.js';
 *
 * Future sub-modules already live alongside this file:
 *   - types.ts          - TypeScript interfaces for connection state and API entities
 *   - budget-resolution.ts - Budget file lookup and resolution helpers
 *   - cache-helpers.ts  - Invalidation helpers for name-resolver caches
 *   - historical-transfers.ts - Historical transfer detection logic
 */

export * from '../actual-client.js';
