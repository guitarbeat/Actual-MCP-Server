// Types for manage-transaction tool

/**
 * Arguments for the manage-transaction tool
 */
export interface ManageTransactionArgs {
  operation: 'create' | 'update';
  id?: string;
  transaction: TransactionData;
}

/**
 * Transaction data for create/update operations
 */
export interface TransactionData {
  account?: string;
  date?: string;
  amount?: number;
  payee?: string;
  category?: string;
  notes?: string;
  cleared?: boolean;
}

/**
 * Parsed and validated transaction input
 */
export interface ParsedTransactionInput {
  operation: 'create' | 'update';
  id?: string;
  accountId?: string;
  date?: string;
  amount?: number;
  payeeId?: string;
  categoryId?: string;
  notes?: string;
  cleared?: boolean;
}

/**
 * Result of transaction operation
 */
export interface TransactionOperationResult {
  transactionId: string;
  operation: 'create' | 'update';
  createdPayee?: boolean;
  createdCategory?: boolean;
}
