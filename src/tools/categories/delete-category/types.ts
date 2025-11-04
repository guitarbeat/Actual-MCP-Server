import { z } from 'zod';

export const deleteCategoryArgsSchema = z
  .object({
    id: z.string(),
  })
  .strict();

export type DeleteCategoryArgs = z.infer<typeof deleteCategoryArgsSchema>;
