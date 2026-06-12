import { zodToJsonSchema } from 'zod-to-json-schema';
import { successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { executeToolAction } from '../../shared/tool-action.js';
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

export async function handler(args: unknown) {
  return executeToolAction(args, {
    parse: RecommendBudgetPlanArgsSchema.parse,
    execute: (parsed) => recommendBudgetPlan(parsed),
    buildResponse: (_args, result) => successWithJson(result),
    fallbackMessage: 'Failed to recommend a budget plan',
    suggestion: 'Verify the target month and optional lookback settings before retrying.',
  });
}
