import { z } from 'zod';
import type { Transaction } from '../../../core/types/domain.js';
import { DateSchema } from '../../../core/types/index.js';

export const ReconcileAccountArgsSchema = z
  .object({
    account: z.string().min(1).describe('Account name or ID to reconcile.'),
    statementBalance: z.number().describe('Statement balance in dollars, for example 1234.56.'),
    statementDate: DateSchema.describe('Statement cutoff date in YYYY-MM-DD format.'),
    forceClear: z
      .boolean()
      .optional()
      .default(false)
      .describe('Force clearing eligible transactions even if the balance is off.'),
  })
  .strict()
  .transform((data) => ({
    ...data,
    statementBalanceCents: Math.round(data.statementBalance * 100),
  }));

export type ReconcileAccountArgs = z.infer<typeof ReconcileAccountArgsSchema>;

export interface ReconciliationTransaction extends Transaction {
  cleared?: boolean;
  starting_balance_flag?: boolean;
}

export interface ReconciliationSnapshot {
  accountId: string;
  accountName: string;
  statementDate: string;
  statementBalanceCents: number;
  actualBalanceCents: number;
  clearedBalanceCents: number;
  unclearedBalanceCents: number;
  differenceCents: number;
  eligibleTransactions: ReconciliationTransaction[];
  unclearedTransactions: ReconciliationTransaction[];
  futureTransactionsIgnored: number;
}

export interface ReconciliationReport {
  accountId: string;
  accountName: string;
  statementDate: string;
  statementBalance: string;
  actualBalance: string;
  clearedBalance: string;
  unclearedBalance: string;
  difference: string;
  status: 'balanced' | 'forced-clear' | 'out-of-balance';
  transactionsCleared: number;
  futureTransactionsIgnored: number;
  reasons: string[];
  unclearedTransactions: Array<{
    id: string;
    date: string;
    payee: string;
    amount: string;
    notes: string;
  }>;
}
