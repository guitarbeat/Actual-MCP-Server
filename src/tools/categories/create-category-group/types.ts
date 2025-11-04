import { z } from 'zod';

export const createCategoryGroupArgsSchema = z
  .object({
    name: z.string(),
  })
  .strict();

export type CreateCategoryGroupArgs = z.infer<typeof createCategoryGroupArgsSchema>;
