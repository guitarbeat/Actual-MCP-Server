import { z } from 'zod';

export const createCategoryArgsSchema = z
  .object({
    name: z.string(),
    groupId: z.string(),
  })
  .strict();

export type CreateCategoryArgs = z.infer<typeof createCategoryArgsSchema>;
