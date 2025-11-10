// ----------------------------
// DELETE RULE TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { RuleHandler } from '../../manage-entity/entity-handlers/rule-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const DeleteRuleSchema = z.object({
  id: z.string().uuid('Rule ID must be a valid UUID'),
});

export const schema = {
  name: 'delete-rule',
  description:
    'Delete an auto-categorization rule from Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Rule ID (UUID)\n\n' +
    'EXAMPLE:\n' +
    '{"id": "rule-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Remove unused rules\n' +
    '- Clean up test rules\n' +
    '- Delete incorrect rules\n\n' +
    'SEE ALSO:\n' +
    '- Use get-rules to find rule IDs\n' +
    '- Use create-rule to add new rules\n' +
    '- Use update-rule to modify rules\n\n' +
    'NOTES:\n' +
    '- ⚠️ WARNING: Deletion is permanent and cannot be undone',
  inputSchema: zodToJsonSchema(DeleteRuleSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof DeleteRuleSchema>): Promise<MCPResponse> {
  try {
    const validated = DeleteRuleSchema.parse(args);
    const handler = new RuleHandler();
    await handler.delete(validated.id);
    handler.invalidateCache();
    return success(`Successfully deleted rule with id ${validated.id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to delete rule',
    });
  }
}
