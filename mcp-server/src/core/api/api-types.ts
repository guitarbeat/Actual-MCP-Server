/**
 * Re-exports of types from @actual-app/api and @actual-app/api/models.
 * These are derived from the API method signatures to avoid depending on
 * internal @actual-app/core package paths.
 */
import type api from '@actual-app/api';

// Entity types derived from API method return types
export type RuleEntity = Awaited<ReturnType<typeof api.getRules>>[number];
export type TransactionEntity = Awaited<ReturnType<typeof api.getTransactions>>[number];

// ImportTransactionsOpts derived from API method parameters
export type ImportTransactionsOpts = NonNullable<Parameters<typeof api.importTransactions>[2]>;

// Re-export API model entity types from @actual-app/api/models
export type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIFileEntity,
  APIPayeeEntity,
  APIScheduleEntity,
  APITagEntity,
} from '@actual-app/api/models';
