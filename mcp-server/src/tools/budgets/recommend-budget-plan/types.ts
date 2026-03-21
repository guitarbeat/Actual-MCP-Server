import { z } from 'zod';

export const RecommendBudgetPlanArgsSchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    lookbackMonths: z
      .number()
      .int()
      .min(1)
      .max(24)
      .optional()
      .default(6)
      .describe('Number of full months before the target month to analyze.'),
    roundingIncrement: z
      .number()
      .int()
      .positive()
      .optional()
      .default(1000)
      .describe('Round variable spending recommendations up to this many cents.'),
    minimumFloor: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .default(5000)
      .describe('Minimum recommendation in cents for categories with recurring spending.'),
  })
  .strict();

export type RecommendBudgetPlanArgs = z.infer<typeof RecommendBudgetPlanArgsSchema>;

export interface BudgetRecommendation {
  categoryId: string;
  categoryName: string;
  groupName: string;
  averageSpent: number;
  latestSpent: number;
  recommendedAmount: number;
  method: 'fixed' | 'average' | 'none';
  reason: string;
  monthlySpend: Array<{ month: string; amount: number }>;
}

export interface BudgetRecommendationResult {
  month: string;
  monthsAnalyzed: string[];
  roundingIncrement: number;
  minimumFloor: number;
  recommendations: BudgetRecommendation[];
  totals: {
    recommendedAmount: number;
    categoriesWithSpending: number;
    fixedCategories: number;
  };
  warnings: string[];
}
