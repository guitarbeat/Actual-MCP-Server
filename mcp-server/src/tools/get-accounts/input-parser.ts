/**
 * Input parser for get-accounts tool
 * Handles optional filtering parameters
 */

import type { GetAccountsArgs } from '../../core/types/index.js';

export interface ParsedGetAccountsInput {
  accountId?: string;
  includeClosed: boolean;
}

export function parseGetAccountsInput(args: GetAccountsArgs = {}): ParsedGetAccountsInput {
  return {
    accountId: args.accountId,
    includeClosed: args.includeClosed ?? false,
  };
}
