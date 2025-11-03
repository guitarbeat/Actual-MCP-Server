// ----------------------------
// GET SCHEDULES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getSchedules } from '../../../actual-api.js';

export const schema = {
  name: 'get-schedules',
  description: 'Get all recurring schedules',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const schedules = await getSchedules();

    return successWithJson(schedules);
  } catch (err) {
    return errorFromCatch(err);
  }
}
