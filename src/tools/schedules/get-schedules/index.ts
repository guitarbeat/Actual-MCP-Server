import { z } from 'zod';

import { errorFromCatch } from '../../../utils/response';
import { actualApi } from '../../../actual-api';

export const schema = z.object({
  tool: z.literal('get-schedules'),
  args: z.object({}),
});

export type GetSchedules = z.infer<typeof schema>;

export async function handler() {
  try {
    const schedules = await actualApi.getSchedules();
    return {
      type: 'string',
      result: JSON.stringify(schedules, null, 2),
    };
  } catch (err) {
    return errorFromCatch(err);
  }
}