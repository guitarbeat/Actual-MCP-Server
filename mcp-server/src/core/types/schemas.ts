// ----------------------------
// ZOD SCHEMAS
// Centralized Zod schemas for validation
// ----------------------------

import { z } from 'zod';

// ----------------------------
// Tool Argument Schemas
// ----------------------------

export const GetTransactionsArgsSchema = z.object({
  accountId: z
    .string()
    .describe(
      'Account name or ID to retrieve transactions from. Use get-accounts tool to find available account IDs. Accepts both human-readable names (e.g., "Checking") or UUIDs.'
    ),
  startDate: z
    .string()
    .optional()
    .describe(
      'Start date for transaction range in YYYY-MM-DD format (e.g., "2024-01-01"). If omitted, defaults to 3 months before endDate or today.'
    ),
  endDate: z
    .string()
    .optional()
    .describe(
      'End date for transaction range in YYYY-MM-DD format (e.g., "2024-01-31"). If omitted, defaults to today.'
    ),
  minAmount: z
    .number()
    .optional()
    .describe(
      'Minimum transaction amount in dollars (e.g., 50.00 for $50). Filters transactions to only include amounts greater than or equal to this value. Negative values represent expenses, positive values represent income.'
    ),
  maxAmount: z
    .number()
    .optional()
    .describe(
      'Maximum transaction amount in dollars (e.g., 100.00 for $100). Filters transactions to only include amounts less than or equal to this value. Negative values represent expenses, positive values represent income.'
    ),
  categoryName: z
    .string()
    .optional()
    .describe(
      'Filter by category name using partial, case-insensitive matching (e.g., "groc" matches "Groceries"). Useful for finding all transactions in a specific spending category.'
    ),
  payeeName: z
    .string()
    .optional()
    .describe(
      'Filter by payee name using partial, case-insensitive matching (e.g., "amazon" matches "Amazon.com"). Useful for tracking spending with specific merchants or vendors.'
    ),
  limit: z
    .number()
    .optional()
    .describe(
      'Maximum number of transactions to return. Useful for limiting results when you only need a sample or the most recent transactions. Applied after all other filters.'
    ),
});

export const SpendingByCategoryArgsSchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe(
      'Start date for spending analysis in YYYY-MM-DD format (e.g., "2024-01-01"). If omitted, defaults to 30 days before endDate or today. Use this to define the beginning of your analysis period.'
    ),
  endDate: z
    .string()
    .optional()
    .describe(
      'End date for spending analysis in YYYY-MM-DD format (e.g., "2024-01-31"). If omitted, defaults to today. Use this to define the end of your analysis period.'
    ),
  accountId: z
    .string()
    .optional()
    .describe(
      'Account name or ID to filter spending analysis to a specific account. Accepts both human-readable names (e.g., "Checking") or UUIDs. If omitted, analyzes spending across all on-budget accounts. Use get-accounts tool to find available account IDs.'
    ),
  includeIncome: z
    .boolean()
    .optional()
    .describe(
      'Whether to include income categories in the breakdown. Default is false (expenses only). Set to true to see both income and expense categories grouped separately. Useful for analyzing both sides of your budget.'
    ),
});

export const MonthlySummaryArgsSchema = z.object({
  months: z
    .number()
    .optional()
    .default(3)
    .describe(
      'Number of months to include in the summary, counting backwards from today (e.g., 3 = last 3 months, 12 = last year). Default is 3 months. Common values: 1 (current month), 3 (quarterly), 6 (semi-annual), 12 (annual).'
    ),
  accountId: z
    .string()
    .optional()
    .describe(
      'Account name or ID to filter the summary to a specific account. Accepts both human-readable names (e.g., "Checking") or UUIDs. If omitted, includes all accounts in the summary. Use get-accounts tool to find available account IDs.'
    ),
});

export const BalanceHistoryArgsSchema = z.object({
  accountId: z
    .string()
    .describe(
      'Account name or ID to retrieve balance history for. Use get-accounts tool to find available account IDs. Accepts both human-readable names (e.g., "Checking") or UUIDs.'
    ),
  includeOffBudget: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether to include off-budget accounts in balance calculations. Default is false (only on-budget accounts). Set to true to include accounts marked as off-budget (e.g., investment accounts, loans).'
    ),
  months: z
    .number()
    .optional()
    .default(3)
    .describe(
      'Number of months of balance history to retrieve, counting backwards from today (e.g., 3 = last 3 months, 12 = last year). Default is 3 months. Common values: 3 (quarterly), 6 (semi-annual), 12 (annual).'
    ),
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

export const GetAccountsArgsSchema = z
  .object({
    accountId: z
      .string()
      .optional()
      .describe(
        'Account name or ID to filter results. Supports partial, case-insensitive matching (e.g., "check" matches "Checking Account"). Accepts both human-readable names or UUIDs. If omitted, returns all accounts.'
      ),
    includeClosed: z
      .boolean()
      .optional()
      .describe(
        'Whether to include closed accounts in the results. Default is false (only open accounts). Set to true to see all accounts including those that have been closed.'
      ),
  })
  .strict();

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
