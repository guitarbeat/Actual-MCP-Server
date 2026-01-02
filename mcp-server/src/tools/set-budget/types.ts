// ----------------------------
// SET BUDGET TYPES
// Type definitions for the consolidated set-budget tool
// ----------------------------

import { z } from 'zod';

/**
 * Convert amount to cents with auto-detection (same logic as transactions).
 * Amounts < 1000 are treated as dollars, amounts >= 1000 are treated as cents.
 *
 * @param amount - Amount in dollars or cents
 * @returns Amount in cents
 */
function convertAmountToCents(amount: number): number {
  const absAmount = Math.abs(amount);

  // If amount is >= 1000, assume it's already in cents
  if (absAmount >= 1000) {
    return Math.round(amount);
  }

  // For amounts < 1000, treat as dollars (multiply by 100)
  // This handles both whole numbers (e.g., 500 → 50000) and decimals (e.g., 500.50 → 50050)
  return Math.round(amount * 100);
}

/**
 * Schema for set-budget tool arguments.
 * Combines amount and carryover operations into a single tool.
 */
export const SetBudgetArgsSchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    category: z.string().describe('Category ID or name'),
    amount: z
      .number()
      .optional()
      .describe('Budget amount (dollars or cents, auto-detected). Supports negative amounts for moving money from categories.'),
    carryover: z.boolean().optional().describe('Enable or disable budget carryover'),
  })
  .strict()
  .refine((data) => data.amount !== undefined || data.carryover !== undefined, {
    message: 'At least one of amount or carryover must be provided',
  })
  .transform((data) => {
    // Convert amount to cents if provided
    if (data.amount !== undefined) {
      return {
        ...data,
        amount: convertAmountToCents(data.amount),
      };
    }
    return data;
  });

/**
 * Inferred type for set-budget arguments (after transformation)
 */
export type SetBudgetArgs = z.infer<typeof SetBudgetArgsSchema>;
