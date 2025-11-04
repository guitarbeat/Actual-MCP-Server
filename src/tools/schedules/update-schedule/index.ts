// ----------------------------
// UPDATE SCHEDULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { missingStringArgument } from '../../../utils/tool-error-builders.js';
import { updateSchedule } from '../../../actual-api.js';

export const schema = {
  name: 'update-schedule',
  description: 'Update an existing recurring schedule',
  inputSchema: {
    type: 'object',
    properties: {
      scheduleId: {
        type: 'string',
        description: 'ID of the schedule to update',
      },
      name: {
        type: 'string',
        description: 'Name of the schedule',
      },
      accountId: {
        type: 'string',
        description: 'ID of the account',
      },
      payee: {
        type: 'string',
        description: 'Payee name or ID',
      },
      amount: {
        type: 'number',
        description: 'Transaction amount',
      },
      category: {
        type: 'string',
        description: 'Category name or ID',
      },
      notes: {
        type: 'string',
        description: 'Transaction notes',
      },
      nextDate: {
        type: 'string',
        description: 'Next occurrence date (YYYY-MM-DD format)',
      },
      rule: {
        type: 'string',
        description: 'Recurrence rule (e.g., "monthly", "weekly", "biweekly")',
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

    const data: Record<string, unknown> = {};

    if (args.name) {
      data.name = args.name;
    }
    if (args.accountId) {
      data.account = args.accountId;
    }
    if (args.payee !== undefined) {
      data.payee = args.payee;
    }
    if (args.amount !== undefined) {
      data.amount = args.amount;
    }
    if (args.category !== undefined) {
      data.category = args.category;
    }
    if (args.notes !== undefined) {
      data.notes = args.notes;
    }
    if (args.nextDate) {
      data.next_date = args.nextDate;
    }
    if (args.rule) {
      data.rule = args.rule;
    }

    await updateSchedule(args.scheduleId as string, data);

    return successWithJson('Successfully updated schedule ' + args.scheduleId);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: `Failed to update schedule ${String(args.scheduleId ?? '')}`.trim(),
      suggestion:
        'Confirm the schedule exists and that any referenced payees, accounts, or categories are valid before retrying.',
    });
  }
}
