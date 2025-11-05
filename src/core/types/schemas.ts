// ----------------------------
// ZOD SCHEMAS
// Centralized Zod schemas for validation
// ----------------------------

import { z } from 'zod';

// ----------------------------
// Tool Argument Schemas
// ----------------------------

export const GetTransactionsArgsSchema = z.object({
  accountId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  categoryName: z.string().optional(),
  payeeName: z.string().optional(),
  limit: z.number().optional(),
});

export const SpendingByCategoryArgsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.string().optional(),
  includeIncome: z.boolean().optional(),
});

export const MonthlySummaryArgsSchema = z.object({
  months: z.number().optional().default(3),
  accountId: z.string().optional(),
});

export const BalanceHistoryArgsSchema = z.object({
  accountId: z.string(),
  includeOffBudget: z.boolean().optional().default(false),
  months: z.number().optional().default(3),
});

export const FinancialInsightsArgsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const BudgetReviewArgsSchema = z.object({
  months: z.number().optional().default(3),
});

export const UpdateTransactionArgsSchema = z.object({
  transactionId: z.string(),
  categoryId: z.string().optional(),
  payeeId: z.string().optional(),
  notes: z.string().optional(),
  amount: z.number().optional(),
});

export const CreateTransactionArgsSchema = z.object({
  accountId: z.string(),
  date: z.string(),
  amount: z.number(),
  payee: z.string().optional(),
  category: z.string().optional(),
  categoryGroup: z.string().optional(),
  notes: z.string().optional(),
  cleared: z.boolean().optional(),
});

// ----------------------------
// Budget Tool Schemas
// ----------------------------

export const SetBudgetAmountArgsSchema = z
  .object({
    month: z.string(),
    categoryId: z.string(),
    amount: z.number(),
  })
  .strict();

export const ResetBudgetHoldArgsSchema = z
  .object({
    month: z.string(),
  })
  .strict();

export const SetBudgetCarryoverArgsSchema = z
  .object({
    month: z.string(),
    categoryId: z.string(),
    enabled: z.boolean(),
  })
  .strict();

export const HoldBudgetForNextMonthArgsSchema = z
  .object({
    month: z.string(),
    amount: z.number(),
  })
  .strict();

// ----------------------------
// Category Tool Schemas
// ----------------------------

export const CreateCategoryArgsSchema = z
  .object({
    name: z.string(),
    groupId: z.string(),
  })
  .strict();

export const UpdateCategoryArgsSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    groupId: z.string().optional(),
  })
  .strict();

export const DeleteCategoryArgsSchema = z
  .object({
    id: z.string(),
  })
  .strict();

export const CreateCategoryGroupArgsSchema = z
  .object({
    name: z.string(),
  })
  .strict();

export const UpdateCategoryGroupArgsSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .strict();

export const DeleteCategoryGroupArgsSchema = z
  .object({
    id: z.string(),
  })
  .strict();

export const GetGroupedCategoriesArgsSchema = z.object({}).strict();

// ----------------------------
// Account Tool Schemas
// ----------------------------

export const GetAccountsArgsSchema = z.object({});

// ----------------------------
// Schedule Tool Schemas
// ----------------------------

export const CreateScheduleArgsSchema = z.object({
  name: z.string(),
  accountId: z.string(),
  payee: z.string().optional(),
  amount: z.number(),
  category: z.string().optional(),
  notes: z.string().optional(),
  nextDate: z.string(),
  rule: z.string(),
});

export const UpdateScheduleArgsSchema = z.object({
  scheduleId: z.string(),
  name: z.string().optional(),
  accountId: z.string().optional(),
  payee: z.string().optional(),
  amount: z.number().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  nextDate: z.string().optional(),
  rule: z.string().optional(),
});

export const DeleteScheduleArgsSchema = z.object({
  scheduleId: z.string(),
});

export const GetSchedulesArgsSchema = z.object({});

// ----------------------------
// Common Validation Schemas
// ----------------------------

/**
 * Schema for UUID validation
 */
export const UUIDSchema = z.string().uuid();

/**
 * Schema for date string validation (YYYY-MM-DD format)
 */
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Schema for month string validation (YYYY-MM format)
 */
export const MonthSchema = z.string().regex(/^\d{4}-\d{2}$/);

/**
 * Schema for amount validation (in cents)
 */
export const AmountSchema = z.number().int();

/**
 * Schema for optional date range
 */
export const DateRangeSchema = z.object({
  startDate: DateSchema.optional(),
  endDate: DateSchema.optional(),
});
