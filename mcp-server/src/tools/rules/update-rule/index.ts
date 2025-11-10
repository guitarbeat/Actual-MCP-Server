// ----------------------------
// UPDATE RULE TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse, error } from '../../../core/response/index.js';
import { RuleHandler } from '../../manage-entity/entity-handlers/rule-handler.js';
import type { RuleData } from '../../manage-entity/types.js';
import { RuleDataSchema } from '../../manage-entity/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const UpdateRuleSchema = z
  .object({
    id: z.string().uuid('Rule ID must be a valid UUID'),
  })
  .merge(RuleDataSchema.partial());

export const schema = {
  name: 'update-rule',
  description:
    'Update an existing auto-categorization rule in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Rule ID (UUID)\n\n' +
    'OPTIONAL (at least one required):\n' +
    '- stage: Rule stage ("pre" or "post")\n' +
    '- conditionsOp: How to combine conditions ("and" or "or")\n' +
    '- conditions: Array of rule conditions\n' +
    '- actions: Array of rule actions\n\n' +
    'EXAMPLES:\n' +
    '- Update conditions: {"id": "rule-id", "conditions": [{"field": "payee", "op": "is", "value": "new-payee-id"}]}\n' +
    '- Update actions: {"id": "rule-id", "actions": [{"field": "category", "op": "set", "value": "new-category-id"}]}\n' +
    '- Change stage: {"id": "rule-id", "stage": "post"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Modify rule conditions\n' +
    '- Update rule actions\n' +
    '- Change rule processing stage\n' +
    '- Fix incorrect rules\n\n' +
    'SEE ALSO:\n' +
    '- Use get-rules to find rule IDs\n' +
    '- Use create-rule to add new rules\n' +
    '- Use delete-rule to remove rules\n\n' +
    'NOTES:\n' +
    '- Only provided fields will be updated\n' +
    '- See create-rule for condition and action structure',
  inputSchema: zodToJsonSchema(UpdateRuleSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof UpdateRuleSchema>): Promise<MCPResponse> {
  try {
    const validated = UpdateRuleSchema.parse(args);
    const { id, ...updateData } = validated;

    if (Object.keys(updateData).length === 0) {
      return error('No fields provided for update', 'Provide at least one field to update');
    }

    const handler = new RuleHandler();
    await handler.update(id, updateData as RuleData);
    handler.invalidateCache();
    return success(`Successfully updated rule with id ${id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to update rule',
    });
  }
}
