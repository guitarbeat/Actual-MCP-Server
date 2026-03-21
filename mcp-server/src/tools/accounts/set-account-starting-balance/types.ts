import { z } from 'zod';
import type { Transaction } from '../../../core/types/domain.js';

export const SetAccountStartingBalanceArgsSchema = z.object({
  account: z.string().min(1, 'Account name or ID is required.'),
  amount: z
    .number()
    .finite('Amount must be a finite number.')
    .describe('Starting balance in dollars or cents. Amounts under 1000 are treated as dollars.'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
    .optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters.').optional(),
});

export interface SetAccountStartingBalanceArgs {
  account: string;
  amountCents: number;
  date?: string;
  notes?: string;
}

export interface StartingBalanceTransaction extends Transaction {
  imported_id?: string;
  cleared?: boolean;
  starting_balance_flag?: boolean;
}

export interface StartingBalancePlan {
  accountId: string;
  accountName: string;
  amountCents: number;
  effectiveDate: string;
  categoryId: string;
  notes?: string;
  existingTransactionId?: string;
  duplicateTransactionIds: string[];
}

export interface StartingBalanceResult {
  accountId: string;
  accountName: string;
  transactionId: string;
  action: 'created' | 'updated';
  effectiveDate: string;
  amountCents: number;
  duplicateTransactionIds: string[];
  warnings: string[];
}
