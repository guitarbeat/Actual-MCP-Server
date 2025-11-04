import { z } from 'zod';

export const setBudgetCarryoverArgsSchema = z
  .object({
    month: z.string(),
    categoryId: z.string(),
    enabled: z.boolean(),
  })
  .strict();

export type SetBudgetCarryoverArgs = z.infer<typeof setBudgetCarryoverArgsSchema>;
