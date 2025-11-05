// ----------------------------
// TYPE DEFINITIONS
// Re-exports from core/types for backward compatibility
// ----------------------------

import { z } from 'zod';
import { ToolSchema } from '@modelcontextprotocol/sdk/types.js';

// MCP-specific types
const _ToolInputSchema = ToolSchema.shape.inputSchema;
export type ToolInput = z.infer<typeof _ToolInputSchema>;

// Domain types
export type {
  Account,
  Transaction,
  Category,
  CategoryGroup,
  CategoryGroupInfo,
  CategorySpending,
  GroupSpending,
  Payee,
  BudgetFile,
} from './core/types/domain.js';

// Zod schemas
export {
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
} from './core/types/schemas.js';

// Tool argument types
export type {
  GetTransactionsArgs,
  SpendingByCategoryArgs,
  MonthlySummaryArgs,
  BalanceHistoryArgs,
  FinancialInsightsArgs,
  BudgetReviewArgs,
  UpdateTransactionArgs,
  CreateTransactionArgs,
  SetBudgetAmountArgs,
  ResetBudgetHoldArgs,
  SetBudgetCarryoverArgs,
  HoldBudgetForNextMonthArgs,
  CreateCategoryArgs,
  UpdateCategoryArgs,
  DeleteCategoryArgs,
  CreateCategoryGroupArgs,
  UpdateCategoryGroupArgs,
  DeleteCategoryGroupArgs,
  GetGroupedCategoriesArgs,
  GetAccountsArgs,
  CreateScheduleArgs,
  UpdateScheduleArgs,
  DeleteScheduleArgs,
  GetSchedulesArgs,
  MonthData,
  MonthBalance,
} from './core/types/tool-args.js';
