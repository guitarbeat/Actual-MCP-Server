// ----------------------------
// DELETE SCHEDULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { missingStringArgument } from '../../../utils/tool-error-builders.js';
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
      return missingStringArgument(
        'scheduleId',
        'Use the get-schedules tool to list recurring schedules and retry with a valid scheduleId.',
      );
    }

    await deleteSchedule(args.scheduleId as string);

    return successWithJson('Successfully deleted schedule ' + args.scheduleId);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: `Failed to delete schedule ${String(args.scheduleId ?? '')}`.trim(),
      suggestion:
        'Confirm the schedule still exists in Actual and that you have permission to delete it before retrying.',
    });
  }
}
