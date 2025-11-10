// ----------------------------
// CORE TYPES BARREL EXPORT
// Centralized export for all type definitions
// ----------------------------

// Domain types (entities from Actual Budget)
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
} from './domain.js';

// Zod schemas for validation
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
  UUIDSchema,
  DateSchema,
  MonthSchema,
  AmountSchema,
  DateRangeSchema,
} from './schemas.js';

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
  CreateTransactionParseResult,
  CreateTransactionInput,
  CreatedTransaction,
  EntityCreationResult,
  MonthBalance,
  MonthData,
  MonthlySummaryReportData,
} from './tool-args.js';

// Response types
export type {
  MCPResponse,
  ContentItem,
  TextContentItem,
  ErrorPayload,
  ErrorContext,
  ValidationErrorOptions,
  NotFoundErrorOptions,
  ApiErrorOptions,
  PermissionErrorOptions,
} from './responses.js';
