/**
 * Input parser for get-accounts tool
 * Handles optional filtering parameters
 */

import type { GetAccountsArgs } from '../../core/types/index.js';

export interface ParsedGetAccountsInput {
  accountId?: string;
  includeClosed: boolean;
}

export class GetAccountsInputParser {
  /**
   * Parse and validate get accounts arguments
   *
   * @param args - Raw input arguments
   * @returns Parsed input with defaults applied
   */
  parse(args: GetAccountsArgs = {}): ParsedGetAccountsInput {
    return {
      accountId: args.accountId,
      includeClosed: args.includeClosed ?? false,
    };
  }
}
