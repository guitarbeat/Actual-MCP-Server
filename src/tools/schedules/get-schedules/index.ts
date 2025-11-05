import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
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
  _args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const schedules = await getSchedules();

    return successWithJson(schedules);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to retrieve schedules from Actual.',
      suggestion: 'Verify the Actual Budget server is reachable and that your user can read schedules before retrying.',
    });
  }
}
