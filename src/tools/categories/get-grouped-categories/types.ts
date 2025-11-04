import { z } from 'zod';

export const getGroupedCategoriesArgsSchema = z.object({}).strict();

export type GetGroupedCategoriesArgs = z.infer<typeof getGroupedCategoriesArgsSchema>;
