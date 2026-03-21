// ----------------------------
// DELETE SCHEDULE TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  errorFromCatch,
  isMCPResponse,
  type MCPResponse,
  success,
} from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { ScheduleHandler } from '../../manage-entity/entity-handlers/schedule-handler.js';

const DeleteScheduleSchema = z.object({
  id: z.string().uuid('Schedule ID must be a valid UUID'),
});

export const schema = {
  name: 'delete-schedule',
  description:
    'Delete a recurring transaction schedule from Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Schedule ID (UUID)\n\n' +
    'EXAMPLE:\n' +
    '{"id": "schedule-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Remove unused schedules\n' +
    '- Clean up test schedules\n' +
    '- Delete incorrect schedules\n\n' +
    'SEE ALSO:\n' +
    '- Use get-schedules to find schedule IDs\n' +
    '- Use create-schedule to add new schedules\n' +
    '- Use update-schedule to modify schedules\n\n' +
    'NOTES:\n' +
    '- ⚠️ WARNING: Deletion is permanent and cannot be undone\n' +
    '- This does not delete transactions created by the schedule',
  inputSchema: zodToJsonSchema(DeleteScheduleSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof DeleteScheduleSchema>): Promise<MCPResponse> {
  try {
    const validated = DeleteScheduleSchema.parse(args);
    const scheduleHandler = new ScheduleHandler();
    await scheduleHandler.delete(validated.id);
    scheduleHandler.invalidateCache();
    return success(`Successfully deleted schedule with id ${validated.id}`);
  } catch (error) {
    if (isMCPResponse(error)) {
      return error;
    }

    return errorFromCatch(error, {
      fallbackMessage: 'Failed to delete schedule',
    });
  }
}
