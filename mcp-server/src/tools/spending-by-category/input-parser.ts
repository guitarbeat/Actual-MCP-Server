// Parses and validates input arguments for spending-by-category tool

import { format, parseISO, subDays } from 'date-fns';

export interface SpendingByCategoryInput {
  startDate: string;
  endDate: string;
  accountId?: string;
  includeIncome: boolean;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(value: unknown, label: 'startDate' | 'endDate'): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || !ISO_DAY.test(value)) {
    throw new Error(`${label} must be a string in YYYY-MM-DD format when provided`);
  }
  const d = parseISO(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${label} is not a valid calendar date`);
  }
  return value;
}

export function parseSpendingByCategoryInput(args: unknown): SpendingByCategoryInput {
  if (!args || typeof args !== 'object') {
    throw new Error('Arguments must be an object');
  }

  const argsObj = args as Record<string, unknown>;
  const { startDate: startRaw, endDate: endRaw, accountId, includeIncome } = argsObj;

  const parsedEnd = parseDay(endRaw, 'endDate');
  const endDate = parsedEnd ?? format(new Date(), 'yyyy-MM-dd');

  const parsedStart = parseDay(startRaw, 'startDate');
  const startDate = parsedStart ?? format(subDays(parseISO(endDate), 30), 'yyyy-MM-dd');

  return {
    startDate,
    endDate,
    accountId: accountId && typeof accountId === 'string' ? accountId : undefined,
    includeIncome: typeof includeIncome === 'boolean' ? includeIncome : false,
  };
}
