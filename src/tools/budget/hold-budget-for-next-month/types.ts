import { z } from 'zod';

export const holdBudgetForNextMonthArgsSchema = z
  .object({
    month: z.string(),
    amount: z.number(),
  })
  .strict();

export type HoldBudgetForNextMonthArgs = z.infer<typeof holdBudgetForNextMonthArgsSchema>;
