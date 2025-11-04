import { z } from 'zod';

export const updateCategoryGroupArgsSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .strict();

export type UpdateCategoryGroupArgs = z.infer<typeof updateCategoryGroupArgsSchema>;
