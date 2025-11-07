// ----------------------------
// UPDATE PAYEE TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse, error } from '../../../core/response/index.js';
import { PayeeHandler } from '../../manage-entity/entity-handlers/payee-handler.js';
import type { PayeeData } from '../../manage-entity/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const UpdatePayeeSchema = z.object({
  id: z.string().uuid('Payee ID must be a valid UUID'),
  name: z.string().min(1).optional(),
  transferAccount: z.string().optional(),
});

export const schema = {
  name: 'update-payee',
  description:
    'Update an existing payee in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Payee ID (UUID)\n\n' +
    'OPTIONAL (at least one required):\n' +
    '- name: New payee name\n' +
    '- transferAccount: New transfer account ID\n\n' +
    'EXAMPLES:\n' +
    '- Rename: {"id": "payee-id", "name": "Updated Name"}\n' +
    '- Update transfer: {"id": "payee-id", "transferAccount": "new-account-id"}\n' +
    '- Both: {"id": "payee-id", "name": "New Name", "transferAccount": "account-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Rename payees\n' +
    '- Update transfer account\n' +
    '- Correct payee information\n\n' +
    'SEE ALSO:\n' +
    '- Use get-payees to find payee IDs\n' +
    '- Use create-payee to add new payees\n' +
    '- Use delete-payee to remove payees\n' +
    '- Use merge-payees to consolidate duplicates\n\n' +
    'NOTES:\n' +
    '- Only provided fields will be updated',
  inputSchema: zodToJsonSchema(UpdatePayeeSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof UpdatePayeeSchema>): Promise<MCPResponse> {
  try {
    const validated = UpdatePayeeSchema.parse(args);
    const { id, ...updateData } = validated;

    if (Object.keys(updateData).length === 0) {
      return error('No fields provided for update', 'Provide at least one field to update');
    }

    const handler = new PayeeHandler();
    await handler.update(id, updateData as PayeeData);
    handler.invalidateCache();
    return success(`Successfully updated payee with id ${id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to update payee',
    });
  }
}
