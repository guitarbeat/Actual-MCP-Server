// ----------------------------
// RESET BUDGET HOLD TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { resetBudgetHold } from '../../../core/api/actual-client.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';

const ResetBudgetHoldSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

export const schema = {
  name: 'reset-budget-hold',
  description:
    'Reset (clear) a budget hold for a specific month.\n\n' +
    'REQUIRED:\n' +
    '- month: Month in YYYY-MM format (e.g., "2024-01")\n\n' +
    'EXAMPLE:\n' +
    '{"month": "2024-01"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Clear budget holds when no longer needed\n' +
    '- Release held budget back to current month\n' +
    '- Cancel planned budget holds\n\n' +
    'SEE ALSO:\n' +
    '- Use get-budget to view current budget holds\n' +
    '- Use hold-budget to set budget holds\n' +
    '- Use set-budget to set budget amounts\n\n' +
    'NOTES:\n' +
    '- Month format: YYYY-MM (e.g., "2024-01" for January 2024)\n' +
    '- This clears any held budget amount for the specified month',
  inputSchema: zodToJsonSchema(ResetBudgetHoldSchema) as ToolInput,
};

export async function handler(
  args: z.infer<typeof ResetBudgetHoldSchema>,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const validated = ResetBudgetHoldSchema.parse(args);
    await resetBudgetHold(validated.month);
    return successWithJson(`Successfully reset budget hold for month ${validated.month}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to reset budget hold',
    });
  }
}
