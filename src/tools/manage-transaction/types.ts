// Types for manage-transaction tool

/**
 * Arguments for the manage-transaction tool (flattened schema)
 */
export interface ManageTransactionArgs {
  operation: 'create' | 'update' | 'delete';
  id?: string;
  // Flattened fields (for create/update)
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
  operation: 'create' | 'update' | 'delete';
  id?: string;
  accountId?: string;
  date?: string;
  amount?: number; // Always in cents after parsing
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
  operation: 'create' | 'update' | 'delete';
  createdPayee?: boolean;
  createdCategory?: boolean;
  details?: {
    date?: string;
    amount?: number;
    payee?: string;
    account?: string;
  };
}
