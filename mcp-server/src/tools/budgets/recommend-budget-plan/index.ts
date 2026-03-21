import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { recommendBudgetPlan } from './planner.js';
import { RecommendBudgetPlanArgsSchema } from './types.js';

export const schema = {
  name: 'recommend-budget-plan',
  description:
    'Analyze recent budget history and recommend category targets for a month without mutating data.\n\n' +
    'WHEN TO USE:\n' +
    '- You want draft budget targets based on prior spending\n' +
    '- You want to review fixed vs variable spending before budgeting a month\n' +
    '- You want a plan that can be reviewed and later applied with apply-budget-plan\n\n' +
    'REQUIRED:\n' +
    '- month: Target month in YYYY-MM format\n\n' +
    'OPTIONAL:\n' +
    '- lookbackMonths: Number of months to analyze before the target month\n' +
    '- roundingIncrement: Round variable categories up to this many cents\n' +
    '- minimumFloor: Minimum recommendation for categories with spending',
  inputSchema: zodToJsonSchema(RecommendBudgetPlanArgsSchema) as ToolInput,
};

export async function handler(
  args: unknown,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = RecommendBudgetPlanArgsSchema.parse(args);
    return successWithJson(await recommendBudgetPlan(parsed));
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to recommend a budget plan',
      suggestion:
        'Verify the target month and optional lookback settings before retrying.',
    });
  }
}
