import type { ImportTransactionBatchArgs } from './types.js';
import { ImportTransactionBatchArgsSchema } from './types.js';

export class ImportTransactionBatchInputParser {
  parse(args: unknown): ImportTransactionBatchArgs {
    return ImportTransactionBatchArgsSchema.parse(args);
  }
}
