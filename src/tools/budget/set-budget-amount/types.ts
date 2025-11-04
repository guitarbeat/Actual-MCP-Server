import { z } from 'zod';

export const setBudgetAmountArgsSchema = z
  .object({
    month: z.string(),
    categoryId: z.string(),
    amount: z.number(),
  })
  .strict();

export type SetBudgetAmountArgs = z.infer<typeof setBudgetAmountArgsSchema>;
