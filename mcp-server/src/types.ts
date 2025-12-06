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
