// ----------------------------
// UPDATE SCHEDULE TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { error, type MCPResponse } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { ScheduleHandler } from '../../manage-entity/entity-handlers/schedule-handler.js';
import type { ScheduleUpdateData } from '../../manage-entity/types.js';
import { ScheduleUpdateDataSchema } from '../../manage-entity/types.js';
import { executeMutationTool } from '../../shared/mutation-tool.js';

const UpdateScheduleSchema = z
  .object({
    id: z.string().uuid('Schedule ID must be a valid UUID'),
  })
  .merge(ScheduleUpdateDataSchema);

export const schema = {
  name: 'update-schedule',
  description:
    'Update an existing recurring transaction schedule in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Schedule ID (UUID)\n\n' +
    'OPTIONAL (at least one required):\n' +
    '- name: Schedule name\n' +
    '- accountId: Account name or ID (supports partial matching)\n' +
    '- account: Account name or ID (alternative to accountId)\n' +
    '- amount: Amount in dollars or cents (auto-detected, like transactions)\n' +
    '- amountOp: Amount operation. Defaults to "is" when amount is provided.\n' +
    '- date: Date string or RecurConfig\n' +
    '- payee: Payee name or ID\n' +
    '- category: Category name or ID\n' +
    '- posts_transaction: Whether to auto-post transactions\n' +
    '- resetNextDate: Recalculate the next scheduled occurrence after applying changes\n\n' +
    'EXAMPLES:\n' +
    '- Update amount: {"id": "schedule-id", "amount": -2000.00, "amountOp": "is"}\n' +
    '- Update date: {"id": "schedule-id", "date": "2024-03-01"}\n' +
    '- Reset next occurrence: {"id": "schedule-id", "resetNextDate": true}\n' +
    '- Multiple fields: {"id": "schedule-id", "amount": -1750.00, "amountOp": "is", "posts_transaction": true}\n\n' +
    'COMMON USE CASES:\n' +
    '- Update recurring bill amounts\n' +
    '- Change schedule dates\n' +
    '- Modify schedule details\n' +
    '- Correct schedule information\n\n' +
    'SEE ALSO:\n' +
    '- Use get-schedules to find schedule IDs\n' +
    '- Use create-schedule to add new schedules\n' +
    '- Use delete-schedule to remove schedules\n\n' +
    'NOTES:\n' +
    '- Only provided fields will be updated\n' +
    '- Amount auto-detection: amounts < 1000 treated as dollars (e.g., -2000 → -$2,000.00)\n' +
    '- Amounts >= 1000 treated as cents (e.g., -200000 → -$2,000.00)\n' +
    '- Supports name resolution for account, payee, and category (partial matching)\n' +
    '- The Actual schedule API does not expose schedule notes, so notes are intentionally not accepted here\n' +
    '- See create-schedule for date and amount formats',
  inputSchema: zodToJsonSchema(UpdateScheduleSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof UpdateScheduleSchema>): Promise<MCPResponse> {
  return executeMutationTool(args, {
    parse: UpdateScheduleSchema.parse,
    createHandler: () => new ScheduleHandler(),
    validate: ({ resetNextDate, ...updateData }) => {
      if (Object.keys(updateData).length === 1 && resetNextDate === undefined) {
        return error('No fields provided for update', 'Provide at least one field to update');
      }
    },
    execute: (scheduleHandler, validated) => {
      const { id, resetNextDate, ...updateData } = validated;
      const scheduleUpdateData: ScheduleUpdateData = {
        ...updateData,
        ...(resetNextDate !== undefined ? { resetNextDate } : {}),
      };

      return scheduleHandler.update(id, scheduleUpdateData);
    },
    successMessage: ({ id }) => `Successfully updated schedule with id ${id}`,
    fallbackMessage: 'Failed to update schedule',
    allowMcpResponsePassthrough: true,
  });
}
