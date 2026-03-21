import { z } from 'zod';

const ImportedSubtransactionSchema = z
  .object({
    amount: z.number().int().describe('Subtransaction amount in cents.'),
    category: z
      .string()
      .optional()
      .describe('Optional category name or ID for the split line item.'),
    notes: z.string().optional().describe('Optional notes for the split line item.'),
  })
  .strict();

export const ImportedTransactionSchema = z
  .object({
    accountId: z.string().min(1).describe('Account name or ID to import into.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    amount: z.number().int().describe('Transaction amount in cents.'),
    payee: z
      .string()
      .optional()
      .describe('Optional payee name or ID. Use transfer payee IDs for transfers.'),
    payee_name: z.string().optional().describe('Optional payee name to create or match.'),
    imported_payee: z.string().optional().describe('Optional raw imported payee/description text.'),
    notes: z.string().optional().describe('Optional transaction notes.'),
    imported_id: z
      .string()
      .optional()
      .describe('Optional stable import identifier used for deduplication.'),
    cleared: z.boolean().optional().describe('Optional cleared flag override.'),
    subtransactions: z
      .array(ImportedSubtransactionSchema)
      .optional()
      .describe('Optional split transaction data.'),
  })
  .strict();

export const ImportTransactionBatchArgsSchema = z
  .object({
    transactions: z
      .array(ImportedTransactionSchema)
      .min(1, 'At least one transaction is required for batch import.'),
    defaultCleared: z
      .boolean()
      .optional()
      .describe('Default cleared state for imported transactions.'),
    dryRun: z.boolean().optional().describe('Preview the import without writing any data.'),
    reimportDeleted: z
      .boolean()
      .optional()
      .describe('Whether previously deleted imported transactions should be re-imported.'),
  })
  .strict();

export type ImportedSubtransaction = z.infer<typeof ImportedSubtransactionSchema>;
export type ImportedTransaction = z.infer<typeof ImportedTransactionSchema>;
export type ImportTransactionBatchArgs = z.infer<typeof ImportTransactionBatchArgsSchema>;

export interface PreparedImportedSubtransaction {
  amount: number;
  category?: string;
  notes?: string;
}

export interface PreparedImportedTransaction {
  date: string;
  amount: number;
  payee?: string;
  payee_name?: string;
  imported_payee?: string;
  notes?: string;
  imported_id?: string;
  cleared?: boolean;
  subtransactions?: PreparedImportedSubtransaction[];
}

export interface ImportPreparationFailure {
  accountReference: string;
  transactionIndex: number;
  error: string;
}

export interface ImportAccountBatch {
  accountId: string;
  accountReferences: string[];
  requested: number;
  transactions: PreparedImportedTransaction[];
  preparationFailures: ImportPreparationFailure[];
}

export interface ImportAccountResult {
  accountId: string;
  accountReferences: string[];
  requested: number;
  prepared: number;
  added: number;
  updated: number;
  failed: number;
  errors: string[];
}

export interface ImportBatchReport {
  dryRun: boolean;
  summary: {
    requestedTransactions: number;
    preparedTransactions: number;
    addedTransactions: number;
    updatedTransactions: number;
    failedTransactions: number;
    affectedAccounts: number;
  };
  accounts: ImportAccountResult[];
  failures: ImportPreparationFailure[];
}
