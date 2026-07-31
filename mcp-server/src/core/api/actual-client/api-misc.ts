/**
 * Miscellaneous API operations for the Actual Budget API.
 *
 * Includes bank sync, import, AQL queries, server info, and name resolution.
 */
import '../../../polyfill.js';
import api from '@actual-app/api';
import type { ExtendedActualApi } from './types.js';
import { invalidateAllReadState } from './cache-helpers.js';
import { ensureConnection, runReadOperation } from './connection-guard.js';
import { markSyncSuccess } from './connection-state.js';

const extendedApi: ExtendedActualApi = api as ExtendedActualApi;

// ── Bank sync & import ─────────────────────────────────────────────────────────

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

// ── Queries ────────────────────────────────────────────────────────────────────

/**
 * Type guard to check if an object is an ActualQL Query instance.
 */
function isActualQLQuery(query: unknown): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = query as any;
  return (
    typeof q === 'object' &&
    q !== null &&
    'serialize' in q &&
    typeof q.serialize === 'function' &&
    'state' in q &&
    typeof q.state === 'object' &&
    q.constructor?.name === 'Query'
  );
}

/**
 * Run an AQL query (ensures API is initialized)
 * Validates that the input is a legitimate Query object to prevent AQL injection.
 */
export async function runAQL(query: unknown): Promise<unknown> {
  if (!isActualQLQuery(query)) {
    throw new Error('Invalid AQL query: Expected an ActualQL Query object. Use the q() builder.');
  }

  return runReadOperation(async () => {
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
      // Cast through unknown to handle current type-definition/runtime signature mismatch.
      return (api.runQuery as unknown as (q: string) => Promise<unknown>)(query);
    }
    throw new Error('runQuery method is not available in this version of the API');
  });
}

// ── Server info & utilities ────────────────────────────────────────────────────

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
