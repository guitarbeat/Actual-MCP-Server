// ----------------------------
// ZOD SCHEMAS
// Centralized Zod schemas for validation
// ----------------------------

import { z } from 'zod';

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

// ----------------------------
// Tool Argument Schemas
// ----------------------------

export const GetTransactionsArgsSchema = z.object({
  accountId: z
    .string()
    .describe(
      'Account name or ID to retrieve transactions from. Use get-accounts tool to find available account IDs. Accepts both human-readable names (e.g., "Checking"), UUIDs, or "all" to search across all accounts.'
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
  excludeTransfers: z
    .boolean()
    .optional()
    .describe(
      'Exclude transfer transactions between accounts. Set to true to only show actual income/expense transactions. Useful when searching for uncategorized transactions that need attention.'
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
  month: MonthSchema.optional().describe('Month to analyze in YYYY-MM format. Defaults to current month.'),
  includeSchedules: z.boolean().optional().describe('Include upcoming scheduled transactions. Default: true.'),
  scheduleDays: z.number().optional().describe('Number of days ahead to look for scheduled transactions. Default: 14.'),
});

export const BudgetReviewArgsSchema = z.object({
  months: z.number().optional().default(3),
});

export const UpdateTransactionArgsSchema = z.object({
  transactionId: z.string().describe('The UUID of the transaction to update.'),
  categoryId: z.string().optional().describe('The UUID of the new category.'),
  payeeId: z.string().optional().describe('The UUID of the new payee.'),
  notes: z.string().optional().describe('New notes for the transaction.'),
  amount: z
    .number()
    .optional()
    .describe('New transaction amount in dollars. Negative for expenses, positive for income.'),
});

export const CreateTransactionArgsSchema = z.object({
  accountId: z.string().describe('The UUID of the account to add the transaction to. Use get-accounts to find IDs.'),
  date: z.string().describe('Transaction date in YYYY-MM-DD format.'),
  amount: z.number().describe('Transaction amount in dollars. Negative for expenses, positive for income.'),
  payee: z.string().optional().describe('Name of the payee/merchant.'),
  category: z.string().optional().describe('Name of the category.'),
  categoryGroup: z.string().optional().describe('Name of the category group.'),
  notes: z.string().optional().describe('Additional notes for the transaction.'),
  cleared: z.boolean().optional().describe('Whether the transaction is cleared. Defaults to false.'),
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
  name: z.string().describe('Name of the schedule.'),
  accountId: z.string().describe('Account ID to associate with the schedule.'),
  payee: z.string().optional().describe('Payee name.'),
  amount: z.number().describe('Amount for the schedule in dollars. Negative for expenses, positive for income.'),
  category: z.string().optional().describe('Category name.'),
  notes: z.string().optional().describe('Notes for the schedule.'),
  nextDate: z.string().describe('Next occurrence date in YYYY-MM-DD format.'),
  rule: z.string().describe('Recurrence rule (e.g., "RRULE:FREQ=MONTHLY").'),
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
