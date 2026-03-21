import { zodToJsonSchema } from 'zod-to-json-schema';
import { setBudgetAmount } from '../../../core/api/actual-client.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { nameResolver } from '../../../core/utils/name-resolver.js';
import type { ApplyBudgetPlanReport } from './types.js';
import { ApplyBudgetPlanArgsSchema } from './types.js';

export const schema = {
  name: 'apply-budget-plan',
  description:
    'Apply category budget recommendations to a target month. Use this after reviewing the output of recommend-budget-plan.\n\n' +
    'WHEN TO USE:\n' +
    '- You have already reviewed budget recommendations and want to write them\n' +
    '- You want partial success reporting instead of failing the entire budget update on one bad category\n\n' +
    'REQUIRED:\n' +
    '- month: Target month in YYYY-MM format\n' +
    '- recommendations: Array of categoryId/category + amount pairs in cents\n\n' +
    'NOTES:\n' +
    '- Zero-value recommendations are skipped to avoid no-op writes',
  inputSchema: zodToJsonSchema(ApplyBudgetPlanArgsSchema) as ToolInput,
};

export async function handler(
  args: unknown,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = ApplyBudgetPlanArgsSchema.parse(args);
    const report: ApplyBudgetPlanReport = {
      month: parsed.month,
      applied: [],
      skipped: [],
      failed: [],
    };

    for (const recommendation of parsed.recommendations) {
      const categoryLabel =
        recommendation.categoryName ||
        recommendation.category ||
        recommendation.categoryId ||
        'Unknown category';

      if (recommendation.amount === 0) {
        report.skipped.push({
          categoryName: categoryLabel,
          reason: 'Recommendation amount is zero.',
        });
        continue;
      }

      try {
        const categoryId =
          recommendation.categoryId ??
          (recommendation.category
            ? await nameResolver.resolveCategory(recommendation.category)
            : undefined);

        if (!categoryId) {
          throw new Error('Category identifier could not be resolved.');
        }

        await setBudgetAmount(parsed.month, categoryId, recommendation.amount);
        report.applied.push({
          categoryId,
          categoryName: categoryLabel,
          amount: recommendation.amount,
        });
      } catch (error) {
        report.failed.push({
          categoryName: categoryLabel,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return successWithJson(report);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to apply budget plan',
      suggestion:
        'Verify the month format and ensure every recommendation includes a category and amount in cents.',
    });
  }
}
