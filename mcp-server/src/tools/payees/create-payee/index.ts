// ----------------------------
// CREATE PAYEE TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { PayeeHandler } from '../../manage-entity/entity-handlers/payee-handler.js';
import type { PayeeData } from '../../manage-entity/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const CreatePayeeSchema = z.object({
  name: z.string().min(1, 'Payee name is required'),
  transferAccount: z.string().optional(),
});

export const schema = {
  name: 'create-payee',
  description:
    'Create a new payee in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- name: Payee name\n\n' +
    'OPTIONAL:\n' +
    '- transferAccount: Account ID for transfer payees\n\n' +
    'EXAMPLES:\n' +
    '- Regular payee: {"name": "Whole Foods"}\n' +
    '- Transfer payee: {"name": "Transfer to Savings", "transferAccount": "savings-account-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Add new merchants/vendors\n' +
    '- Create transfer payees\n' +
    '- Standardize payee names\n\n' +
    'SEE ALSO:\n' +
    '- Use get-payees to list all payees\n' +
    '- Use update-payee to modify payees\n' +
    '- Use delete-payee to remove payees\n' +
    '- Use merge-payees to consolidate duplicate payees\n\n' +
    'NOTES:\n' +
    '- Transfer payees are used for account-to-account transfers\n' +
    '- Regular payees represent merchants or vendors',
  inputSchema: zodToJsonSchema(CreatePayeeSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof CreatePayeeSchema>): Promise<MCPResponse> {
  try {
    const validated = CreatePayeeSchema.parse(args);
    const handler = new PayeeHandler();
    const payeeId = await handler.create(validated as PayeeData);
    handler.invalidateCache();
    return success(`Successfully created payee "${validated.name}" with id ${payeeId}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to create payee',
    });
  }
}
