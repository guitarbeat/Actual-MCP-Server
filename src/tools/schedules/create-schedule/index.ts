// ----------------------------
// CREATE SCHEDULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import {
  missingNumberArgument,
  missingStringArgument,
} from '../../../utils/tool-error-builders.js';
import { createSchedule } from '../../../actual-api.js';

export const schema = {
  name: 'create-schedule',
  description: 'Create a new recurring schedule for transactions',
  inputSchema: {
    type: 'object',
    properties: {
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
    required: ['name', 'accountId', 'amount', 'nextDate', 'rule'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.name || typeof args.name !== 'string') {
      return missingStringArgument(
        'name',
        'Provide the schedule name as plain text, such as "Rent" or "Gym Membership".',
      );
    }
    if (!args.accountId || typeof args.accountId !== 'string') {
      return missingStringArgument(
        'accountId',
        'Use the get-accounts tool to list available accounts and retry with a valid accountId.',
      );
    }
    if (args.amount === undefined || typeof args.amount !== 'number') {
      return missingNumberArgument(
        'amount',
        'Provide the amount in milliunits (e.g., -124000 for -$1240.00) to match Actual Budget expectations.',
      );
    }
    if (!args.nextDate || typeof args.nextDate !== 'string') {
      return missingStringArgument(
        'nextDate',
        'Supply the next occurrence as an ISO date string like 2025-12-01.',
      );
    }
    if (!args.rule || typeof args.rule !== 'string') {
      return missingStringArgument(
        'rule',
        'Provide the recurrence rule identifier (e.g., "monthly" or "weekly"). Use get-schedules to review examples.',
      );
    }

    const data: Record<string, unknown> = {
      name: args.name,
      account: args.accountId,
      amount: args.amount,
      next_date: args.nextDate,
      rule: args.rule,
    };

    if (args.payee) {
      data.payee = args.payee;
    }
    if (args.category) {
      data.category = args.category;
    }
    if (args.notes) {
      data.notes = args.notes;
    }

    const id: string = await createSchedule(data);

    return successWithJson('Successfully created schedule ' + id);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to create the schedule in Actual.',
      suggestion:
        'Verify the accountId, category, and payee references are valid and that the Actual server is reachable.',
    });
  }
}
