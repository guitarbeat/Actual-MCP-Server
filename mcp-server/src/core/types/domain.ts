// Shared domain types and interfaces (Account, Transaction, Category, etc.)

export interface Account {
  id: string;
  name: string;
  type?: string;
  offbudget?: boolean;
  closed?: boolean;
  balance?: number;
  balance_current?: number | null;
}

export interface Transaction {
  id: string;
  account: string;
  date: string;
  amount: number;
  payee?: string | null;
  payee_name?: string;
  imported_payee?: string | null;
  category?: string | null;
  category_name?: string;
  notes?: string | null;
  transfer_id?: string | null;
  is_parent?: boolean;
  is_child?: boolean;
  starting_balance_flag?: boolean | null;
  account_name?: string;
}

export interface Category {
  id: string;
  name: string;
  group_id: string;
  is_income?: boolean;
}

export interface CategoryGroup {
  id: string;
  name: string;
  is_income?: boolean;
  categories?: Category[];
}

export interface CategoryGroupInfo {
  id: string;
  name: string;
  isIncome: boolean;
  isSavingsOrInvestment: boolean;
}

export interface CategorySpending {
  id: string;
  name: string;
  group: string;
  isIncome: boolean;
  total: number;
  transactions: number;
}

export interface GroupSpending {
  name: string;
  total: number;
  categories: CategorySpending[];
}

export interface Payee {
  id: string;
  name: string;
  transfer_acct?: string;
}

export interface Tag {
  id: string;
  tag: string;
  color?: string | null;
  description?: string | null;
}

export interface BudgetFile {
  id?: string;
  cloudFileId?: string;
  groupId?: string;
  name: string;
}
