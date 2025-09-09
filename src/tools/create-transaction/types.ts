// Types/interfaces for create-transaction tool

export interface CreateTransactionInput {
  accountId: string;
  date: string;
  amount: number;
  payee?: string;
  category?: string;
  categoryGroup?: string;
  notes?: string;
  cleared?: boolean;
}

export interface CreatedTransaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  payee?: string;
  payeeId?: string;
  category?: string;
  categoryId?: string;
  notes?: string;
  cleared: boolean;
}

export interface EntityCreationResult {
  payeeId?: string;
  categoryId?: string;
  createdPayee?: boolean;
  createdCategory?: boolean;
}
