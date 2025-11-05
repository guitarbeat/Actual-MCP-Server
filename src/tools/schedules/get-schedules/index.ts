import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { getSchedules } from '../../../actual-api.js';

export const schema = {
  name: 'get-schedules',
  description:
    'Retrieve all recurring transaction schedules. Schedules automatically create transactions on a recurring basis (monthly rent, weekly groceries, etc.).\n\n' +
    'RETURNED DATA:\n' +
    '- Schedule ID (UUID) - Use this to update or delete schedules\n' +
    '- Schedule name (e.g., "Monthly Rent", "Weekly Groceries")\n' +
    '- Account ID and name\n' +
    '- Amount in cents (negative for expenses, positive for income)\n' +
    '- Next occurrence date\n' +
    '- Recurrence rule (frequency: monthly, weekly, yearly, etc.)\n' +
    '- Payee and category (if set)\n\n' +
    'EXAMPLE:\n' +
    '- Get all schedules: {} or no arguments\n\n' +
    'COMMON USE CASES:\n' +
    '- Reviewing all recurring transactions\n' +
    '- Finding schedule IDs before updating or deleting with manage-entity\n' +
    '- Checking next occurrence dates for scheduled transactions\n' +
    '- Verifying recurring bill schedules\n\n' +
    'NOTES:\n' +
    '- No parameters required\n' +
    '- Amounts are in cents (e.g., -150000 = -$1,500.00)\n' +
    '- Negative amounts = expenses, positive = income\n' +
    '- Next occurrence date shows when transaction will be created\n' +
    '- Use manage-entity to create, update, or delete schedules\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-schedules to see all recurring transactions\n' +
    '2. Use manage-entity to create, update, or delete schedules\n' +
    '3. Use get-transactions to verify scheduled transactions were created\n\n' +
    'SEE ALSO:\n' +
    '- manage-entity: Create, update, or delete schedules\n' +
    '- get-accounts: Find account IDs for schedules\n' +
    '- get-transactions: View transactions created by schedules\n' +
    '- get-payees: Find payee IDs for schedules',
  inputSchema: {
    type: 'object',
    description:
      'This tool does not accept any arguments. Returns all recurring transaction schedules including their frequency, amount, account, and next occurrence date.',
    properties: {},
  },
};

export async function handler(
  _args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const schedules = await getSchedules();

    return successWithJson(schedules);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to retrieve schedules from Actual.',
      suggestion: 'Verify the Actual Budget server is reachable and that your user can read schedules before retrying.',
    });
  }
}
