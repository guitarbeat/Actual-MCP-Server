// ----------------------------
// TYPE DEFINITIONS
// Re-exports from core/types for backward compatibility
// ----------------------------

// MCP-specific types
// ToolInput represents a JSON schema object (result of zodToJsonSchema)
// Used as a type annotation for tool inputSchema properties
export type ToolInput = Record<string, unknown>;

// Domain types
export type {
  Account,
  BudgetFile,
  Category,
  CategoryGroup,
  CategoryGroupInfo,
  CategorySpending,
  GroupSpending,
  Payee,
  Transaction,
} from './core/types/domain.js';

// Zod schemas
export {
  BalanceHistoryArgsSchema,
  BudgetReviewArgsSchema,
  CreateCategoryArgsSchema,
  CreateCategoryGroupArgsSchema,
  CreateScheduleArgsSchema,
  CreateTransactionArgsSchema,
  DeleteCategoryArgsSchema,
  DeleteCategoryGroupArgsSchema,
  DeleteScheduleArgsSchema,
  FinancialInsightsArgsSchema,
  GetAccountsArgsSchema,
  GetGroupedCategoriesArgsSchema,
  GetSchedulesArgsSchema,
  GetTransactionsArgsSchema,
  HoldBudgetForNextMonthArgsSchema,
  MonthlySummaryArgsSchema,
  ResetBudgetHoldArgsSchema,
  SetBudgetAmountArgsSchema,
  SetBudgetCarryoverArgsSchema,
  SpendingByCategoryArgsSchema,
  UpdateCategoryArgsSchema,
  UpdateCategoryGroupArgsSchema,
  UpdateScheduleArgsSchema,
  UpdateTransactionArgsSchema,
} from './core/types/schemas.js';

// Tool argument types
export type {
  BalanceHistoryArgs,
  BudgetReviewArgs,
  CreateCategoryArgs,
  CreateCategoryGroupArgs,
  CreateScheduleArgs,
  CreateTransactionArgs,
  DeleteCategoryArgs,
  DeleteCategoryGroupArgs,
  DeleteScheduleArgs,
  FinancialInsightsArgs,
  GetAccountsArgs,
  GetGroupedCategoriesArgs,
  GetSchedulesArgs,
  GetTransactionsArgs,
  HoldBudgetForNextMonthArgs,
  MonthBalance,
  MonthData,
  MonthlySummaryArgs,
  ResetBudgetHoldArgs,
  SetBudgetAmountArgs,
  SetBudgetCarryoverArgs,
  SpendingByCategoryArgs,
  UpdateCategoryArgs,
  UpdateCategoryGroupArgs,
  UpdateScheduleArgs,
  UpdateTransactionArgs,
} from './core/types/tool-args.js';
