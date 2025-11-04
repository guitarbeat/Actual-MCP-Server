import { z } from 'zod';

export const deleteCategoryGroupArgsSchema = z
  .object({
    id: z.string(),
  })
  .strict();

export type DeleteCategoryGroupArgs = z.infer<typeof deleteCategoryGroupArgsSchema>;
