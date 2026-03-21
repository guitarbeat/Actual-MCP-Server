import { z } from 'zod';

export const BudgetPlanEntrySchema = z
  .object({
    categoryId: z.string().optional().describe('Category ID to update.'),
    category: z.string().optional().describe('Category name or ID to update.'),
    categoryName: z.string().optional().describe('Display name for reporting.'),
    amount: z.number().int().describe('Budget amount in cents.'),
  })
  .strict()
  .refine((value) => value.categoryId !== undefined || value.category !== undefined, {
    message: 'Each recommendation must include categoryId or category.',
  });

export const ApplyBudgetPlanArgsSchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    recommendations: z
      .array(BudgetPlanEntrySchema)
      .min(1, 'At least one recommendation is required.'),
  })
  .strict();

export type ApplyBudgetPlanArgs = z.infer<typeof ApplyBudgetPlanArgsSchema>;

export interface ApplyBudgetPlanReport {
  month: string;
  applied: Array<{ categoryId: string; categoryName: string; amount: number }>;
  skipped: Array<{ categoryName: string; reason: string }>;
  failed: Array<{ categoryName: string; error: string }>;
}
