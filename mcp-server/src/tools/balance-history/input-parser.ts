// Parses and validates input arguments for balance-history tool

import type { BalanceHistoryArgs } from '../../core/types/index.js';

export interface BalanceHistoryInput {
  accountId: string;
  includeOffBudget: boolean;
  months: number;
}

export function parseBalanceHistoryInput(args: BalanceHistoryArgs): BalanceHistoryInput {
  const { accountId, includeOffBudget, months } = args;
  return {
    accountId,
    includeOffBudget: typeof includeOffBudget === 'boolean' ? includeOffBudget : false,
    months: typeof months === 'number' && months > 0 ? months : 12,
  };
}
