// ----------------------------
// DELETE SCHEDULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { deleteSchedule } from '../../../actual-api.js';

export const schema = {
  name: 'delete-schedule',
  description: 'Delete a recurring schedule',
  inputSchema: {
    type: 'object',
    properties: {
      scheduleId: {
        type: 'string',
        description: 'ID of the schedule to delete',
      },
    },
    required: ['scheduleId'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.scheduleId || typeof args.scheduleId !== 'string') {
      return errorFromCatch('scheduleId is required and must be a string');
    }

    await deleteSchedule(args.scheduleId as string);

    return successWithJson('Successfully deleted schedule ' + args.scheduleId);
  } catch (err) {
    return errorFromCatch(err);
  }
}
