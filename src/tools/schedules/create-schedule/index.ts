// ----------------------------
// CREATE SCHEDULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
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
      return errorFromCatch('name is required and must be a string');
    }
    if (!args.accountId || typeof args.accountId !== 'string') {
      return errorFromCatch('accountId is required and must be a string');
    }
    if (args.amount === undefined || typeof args.amount !== 'number') {
      return errorFromCatch('amount is required and must be a number');
    }
    if (!args.nextDate || typeof args.nextDate !== 'string') {
      return errorFromCatch('nextDate is required and must be a string');
    }
    if (!args.rule || typeof args.rule !== 'string') {
      return errorFromCatch('rule is required and must be a string');
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
    return errorFromCatch(err);
  }
}

