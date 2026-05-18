// Parses and validates input arguments for get-transactions tool

import { GetTransactionsArgsSchema } from '../../core/types/schemas.js';
import type { GetTransactionsArgs } from '../../core/types/index.js';

export class GetTransactionsInputParser {
  parse(args: unknown): GetTransactionsArgs {
    return GetTransactionsArgsSchema.parse(args);
  }
}
