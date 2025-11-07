// ----------------------------
// HOLD BUDGET TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { holdBudgetForNextMonth } from '../../../actual-api.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const HoldBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  amount: z.number().int().positive('Amount must be a positive integer in cents'),
});

export const schema = {
  name: 'hold-budget',
  description:
    'Hold budget amount for the next month. Use to save for large purchases or irregular expenses.\n\n' +
    'REQUIRED:\n' +
    '- month: Month in YYYY-MM format (e.g., "2024-01")\n' +
    '- amount: Amount to hold in cents (e.g., 50000 = $500.00)\n\n' +
    'EXAMPLE:\n' +
    '{"month": "2024-01", "amount": 50000}\n\n' +
    'COMMON USE CASES:\n' +
    '- Save unused budget for next month\n' +
    '- Plan for large irregular expenses\n' +
    '- Build up budget over multiple months\n' +
    '- Manage budget flexibility month-to-month\n\n' +
    'SEE ALSO:\n' +
    '- Use get-budget to view current budget amounts\n' +
    '- Use set-budget to set budget amounts\n' +
    '- Use reset-budget-hold to clear budget holds\n' +
    '- Use spending-by-category to see actual spending\n\n' +
    'NOTES:\n' +
    '- Month format: YYYY-MM (e.g., "2024-01" for January 2024)\n' +
    '- Amount in cents (e.g., 50000 = $500.00, 12500 = $125.00)\n' +
    '- Hold amount becomes available in the following month',
  inputSchema: zodToJsonSchema(HoldBudgetSchema) as ToolInput,
};

export async function handler(
  args: z.infer<typeof HoldBudgetSchema>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const validated = HoldBudgetSchema.parse(args);
    await holdBudgetForNextMonth(validated.month, validated.amount);
    return successWithJson(`Successfully held budget amount ${validated.amount} cents for month ${validated.month}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to hold budget',
    });
  }
}
