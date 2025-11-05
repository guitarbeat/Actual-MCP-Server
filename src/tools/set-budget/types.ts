// ----------------------------
// SET BUDGET TYPES
// Type definitions for the consolidated set-budget tool
// ----------------------------

import { z } from 'zod';

/**
 * Schema for set-budget tool arguments.
 * Combines amount and carryover operations into a single tool.
 */
export const SetBudgetArgsSchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    category: z.string().describe('Category ID or name'),
    amount: z.number().optional().describe('Budget amount to set (in cents)'),
    carryover: z.boolean().optional().describe('Enable or disable budget carryover'),
  })
  .strict()
  .refine((data) => data.amount !== undefined || data.carryover !== undefined, {
    message: 'At least one of amount or carryover must be provided',
  });

/**
 * Inferred type for set-budget arguments
 */
export type SetBudgetArgs = z.infer<typeof SetBudgetArgsSchema>;
