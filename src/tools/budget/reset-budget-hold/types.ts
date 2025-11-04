import { z } from 'zod';

export const resetBudgetHoldArgsSchema = z
  .object({
    month: z.string(),
  })
  .strict();

export type ResetBudgetHoldArgs = z.infer<typeof resetBudgetHoldArgsSchema>;
