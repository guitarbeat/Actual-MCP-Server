// Types for manage-account tool

/**
 * Valid account types in Actual Budget
 */
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'mortgage' | 'debt' | 'other';

/**
 * Arguments for the manage-account tool
 */
export interface ManageAccountArgs {
  operation: 'create' | 'update' | 'delete' | 'close' | 'reopen' | 'balance';
  id?: string;
  account?: AccountData;
  initialBalance?: number;
  transferAccountId?: string;
  transferCategoryId?: string;
  date?: string;
}

/**
 * Account data for create/update operations
 */
export interface AccountData {
  name?: string;
  type?: AccountType;
  offbudget?: boolean;
}

/**
 * Parsed and validated account input
 */
export interface ParsedAccountInput {
  operation: 'create' | 'update' | 'delete' | 'close' | 'reopen' | 'balance';
  id?: string;
  name?: string;
  type?: AccountType;
  offbudget?: boolean;
  initialBalance?: number;
  transferAccountId?: string;
  transferCategoryId?: string;
  date?: string;
}

/**
 * Result of account operation
 */
export interface AccountOperationResult {
  accountId: string;
  operation: 'create' | 'update' | 'delete' | 'close' | 'reopen' | 'balance';
  balance?: number;
  details?: {
    name?: string;
    type?: AccountType;
    offbudget?: boolean;
    closed?: boolean;
    transferredTo?: string;
  };
}
