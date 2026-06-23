import '../../../polyfill.js';
import api from '@actual-app/api';
import type { RuleEntity, TransactionEntity } from '../api-types.js';
import type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
  APIScheduleEntity,
  APITagEntity,
  ExtendedActualApi,
} from './types.js';
import type { BudgetFile } from '../../types/index.js';
import { runReadOperation } from './connection.js';

const extendedApi: ExtendedActualApi = api as ExtendedActualApi;

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
 * Get all tags (ensures API is initialized)
 */
export async function getTags(): Promise<APITagEntity[]> {
  return runReadOperation(() => api.getTags(), { cacheKey: 'tags:all' });
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
 * Get all schedules (ensures API is initialized)
 */
export async function getSchedules(): Promise<APIScheduleEntity[]> {
  return runReadOperation(async () => {
    return (await extendedApi.getSchedules?.()) ?? [];
  });
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
