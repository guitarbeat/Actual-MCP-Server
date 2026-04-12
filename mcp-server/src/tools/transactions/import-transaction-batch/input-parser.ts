import type { ImportTransactionBatchArgs } from './types.js';
import { ImportTransactionBatchArgsSchema } from './types.js';

export function parseImportTransactionBatchInput(args: unknown): ImportTransactionBatchArgs {
  return ImportTransactionBatchArgsSchema.parse(args);
}
