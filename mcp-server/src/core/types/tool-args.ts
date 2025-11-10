// ----------------------------
// TOOL ARGUMENT TYPES
// Type definitions for tool arguments (inferred from Zod schemas)
// ----------------------------

import { z } from 'zod';
import {
  GetTransactionsArgsSchema,
  SpendingByCategoryArgsSchema,
  MonthlySummaryArgsSchema,
  BalanceHistoryArgsSchema,
  FinancialInsightsArgsSchema,
  BudgetReviewArgsSchema,
  UpdateTransactionArgsSchema,
  CreateTransactionArgsSchema,
  SetBudgetAmountArgsSchema,
  ResetBudgetHoldArgsSchema,
  SetBudgetCarryoverArgsSchema,
  HoldBudgetForNextMonthArgsSchema,
  CreateCategoryArgsSchema,
  UpdateCategoryArgsSchema,
  DeleteCategoryArgsSchema,
  CreateCategoryGroupArgsSchema,
  UpdateCategoryGroupArgsSchema,
  DeleteCategoryGroupArgsSchema,
  GetGroupedCategoriesArgsSchema,
  GetAccountsArgsSchema,
  CreateScheduleArgsSchema,
  UpdateScheduleArgsSchema,
  DeleteScheduleArgsSchema,
  GetSchedulesArgsSchema,
} from './schemas.js';

// ----------------------------
// Tool Argument Types (inferred from schemas)
// ----------------------------

export type GetTransactionsArgs = z.infer<typeof GetTransactionsArgsSchema>;
export type SpendingByCategoryArgs = z.infer<typeof SpendingByCategoryArgsSchema>;
export type MonthlySummaryArgs = z.infer<typeof MonthlySummaryArgsSchema>;
export type BalanceHistoryArgs = z.infer<typeof BalanceHistoryArgsSchema>;
export type FinancialInsightsArgs = z.infer<typeof FinancialInsightsArgsSchema>;
export type BudgetReviewArgs = z.infer<typeof BudgetReviewArgsSchema>;
export type UpdateTransactionArgs = z.infer<typeof UpdateTransactionArgsSchema>;
export type CreateTransactionArgs = z.infer<typeof CreateTransactionArgsSchema>;

// Budget tool types
export type SetBudgetAmountArgs = z.infer<typeof SetBudgetAmountArgsSchema>;
export type ResetBudgetHoldArgs = z.infer<typeof ResetBudgetHoldArgsSchema>;
export type SetBudgetCarryoverArgs = z.infer<typeof SetBudgetCarryoverArgsSchema>;
export type HoldBudgetForNextMonthArgs = z.infer<typeof HoldBudgetForNextMonthArgsSchema>;

// Category tool types
export type CreateCategoryArgs = z.infer<typeof CreateCategoryArgsSchema>;
export type UpdateCategoryArgs = z.infer<typeof UpdateCategoryArgsSchema>;
export type DeleteCategoryArgs = z.infer<typeof DeleteCategoryArgsSchema>;
export type CreateCategoryGroupArgs = z.infer<typeof CreateCategoryGroupArgsSchema>;
export type UpdateCategoryGroupArgs = z.infer<typeof UpdateCategoryGroupArgsSchema>;
export type DeleteCategoryGroupArgs = z.infer<typeof DeleteCategoryGroupArgsSchema>;
export type GetGroupedCategoriesArgs = z.infer<typeof GetGroupedCategoriesArgsSchema>;

// Account tool types
export type GetAccountsArgs = z.infer<typeof GetAccountsArgsSchema>;

// Schedule tool types
export type CreateScheduleArgs = z.infer<typeof CreateScheduleArgsSchema>;
export type UpdateScheduleArgs = z.infer<typeof UpdateScheduleArgsSchema>;
export type DeleteScheduleArgs = z.infer<typeof DeleteScheduleArgsSchema>;
export type GetSchedulesArgs = z.infer<typeof GetSchedulesArgsSchema>;

// ----------------------------
// Additional Tool-Related Types
// ----------------------------

/**
 * Result of parsing create transaction input
 */
export interface CreateTransactionParseResult {
  input: CreateTransactionInput;
  warnings: string[];
}

/**
 * Input for creating a transaction
 */
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

/**
 * Result of creating a transaction
 */
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

/**
 * Result of entity creation (payee, category)
 */
export interface EntityCreationResult {
  payeeId?: string;
  categoryId?: string;
  createdPayee?: boolean;
  createdCategory?: boolean;
  transactionIds: string[];
  wasAdded: boolean;
  wasUpdated: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Monthly balance data point
 */
export interface MonthBalance {
  year: number;
  month: number;
  balance: number;
  transactions: number;
}

/**
 * Monthly summary data point
 */
export interface MonthData {
  year: number;
  month: number;
  income: number;
  expenses: number;
  investments: number;
  transactions: number;
}

/**
 * Report data for monthly summary
 */
export interface MonthlySummaryReportData {
  start: string;
  end: string;
  accountName?: string;
  accountId?: string;
  sortedMonths: MonthData[];
  avgIncome: number;
  avgExpenses: number;
  avgInvestments: number;
  avgTraditionalSavings: number;
  avgTotalSavings: number;
  avgTraditionalSavingsRate: number;
  avgTotalSavingsRate: number;
}
