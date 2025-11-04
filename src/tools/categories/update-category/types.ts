import { z } from 'zod';

export const updateCategoryArgsSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    groupId: z.string().optional(),
  })
  .strict();

export type UpdateCategoryArgs = z.infer<typeof updateCategoryArgsSchema>;
