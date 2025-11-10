// ----------------------------
// DELETE PAYEE TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { PayeeHandler } from '../../manage-entity/entity-handlers/payee-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const DeletePayeeSchema = z.object({
  id: z.string().uuid('Payee ID must be a valid UUID'),
});

export const schema = {
  name: 'delete-payee',
  description:
    'Delete a payee from Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Payee ID (UUID)\n\n' +
    'EXAMPLE:\n' +
    '{"id": "payee-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Remove unused payees\n' +
    '- Clean up test payees\n' +
    '- Delete duplicate payees (consider merge-payees instead)\n\n' +
    'SEE ALSO:\n' +
    '- Use get-payees to find payee IDs\n' +
    '- Use create-payee to add new payees\n' +
    '- Use update-payee to modify payees\n' +
    '- Use merge-payees to consolidate duplicates instead of deleting\n\n' +
    'NOTES:\n' +
    '- ⚠️ WARNING: Deletion is permanent and cannot be undone\n' +
    '- Consider using merge-payees to consolidate duplicates instead',
  inputSchema: zodToJsonSchema(DeletePayeeSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof DeletePayeeSchema>): Promise<MCPResponse> {
  try {
    const validated = DeletePayeeSchema.parse(args);
    const handler = new PayeeHandler();
    await handler.delete(validated.id);
    handler.invalidateCache();
    return success(`Successfully deleted payee with id ${validated.id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to delete payee',
    });
  }
}
