// ----------------------------
// CREATE SCHEDULE TOOL
// ----------------------------

import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, type MCPResponse, success } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { ScheduleHandler } from '../../manage-entity/entity-handlers/schedule-handler.js';
import type { ScheduleData } from '../../manage-entity/types.js';
import { ScheduleDataSchema } from '../../manage-entity/types.js';

export const schema = {
  name: 'create-schedule',
  description:
    'Create a new recurring transaction schedule in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- date: Date string (YYYY-MM-DD) or RecurConfig object for recurring schedules\n\n' +
    'OPTIONAL:\n' +
    '- name: Schedule name (recommended, must be unique)\n' +
    '- accountId: Account name or ID (supports partial matching, e.g., "Chase" matches "Chase Checking")\n' +
    '- account: Account name or ID (alternative to accountId)\n' +
    '- amount: Amount in dollars or cents (auto-detected, like transactions)\n' +
    '- amountOp: Amount operation (is, isapprox, isbetween)\n' +
    '- payee: Payee name or ID\n' +
    '- category: Category name or ID\n' +
    '- notes: Transaction notes\n' +
    '- posts_transaction: Whether to automatically post transactions (default: false)\n\n' +
    'EXAMPLES:\n' +
    '- Simple date: {"name": "Monthly Rent", "accountId": "Chase Checking", "amount": -1500.00, "date": "2024-02-01"}\n' +
    '- Recurring monthly: {"name": "Monthly Rent", "accountId": "🏦 Chase Checking", "amount": -1500.00, "date": {"frequency": "monthly", "start": "2024-02-01", "endMode": "never"}}\n' +
    '- Weekly: {"name": "Weekly Groceries", "accountId": "Checking", "amount": -100.00, "date": {"frequency": "weekly", "start": "2024-02-01", "endMode": "after_n_occurrences", "endOccurrences": 52}}\n\n' +
    'COMMON USE CASES:\n' +
    '- Set up recurring bills\n' +
    '- Schedule regular income\n' +
    '- Automate recurring transactions\n' +
    '- Create templates for regular expenses\n\n' +
    'SEE ALSO:\n' +
    '- Use get-schedules to list all schedules\n' +
    '- Use update-schedule to modify schedules\n' +
    '- Use delete-schedule to remove schedules\n\n' +
    'NOTES:\n' +
    '- Date can be a simple string (YYYY-MM-DD) or RecurConfig object\n' +
    '- RecurConfig supports daily, weekly, monthly, yearly frequencies\n' +
    '- Amount auto-detection: amounts < 1000 treated as dollars (e.g., -1500 → -$1,500.00)\n' +
    '- Amounts >= 1000 treated as cents (e.g., -150000 → -$1,500.00)\n' +
    '- Supports name resolution for account, payee, and category (partial matching)',
  inputSchema: zodToJsonSchema(ScheduleDataSchema) as ToolInput,
};

export async function handler(args: ScheduleData): Promise<MCPResponse> {
  try {
    const validated = ScheduleDataSchema.parse(args);
    const handler = new ScheduleHandler();
    const scheduleId = await handler.create(validated);
    handler.invalidateCache();
    return success(`Successfully created schedule "${validated.name || 'Unnamed'}" with id ${scheduleId}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to create schedule',
    });
  }
}
