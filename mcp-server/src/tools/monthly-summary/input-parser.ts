export interface MonthlySummaryInput {
  months: number;
  accountId?: string;
}

export function parseMonthlySummaryInput(args: unknown): MonthlySummaryInput {
  if (!args || typeof args !== 'object') {
    throw new Error('Arguments must be an object');
  }

  const argsObj = args as Record<string, unknown>;
  const months = typeof argsObj.months === 'number' && argsObj.months > 0 ? argsObj.months : 3;
  const accountId =
    typeof argsObj.accountId === 'string' && argsObj.accountId.length > 0
      ? argsObj.accountId
      : undefined;

  return { months, accountId };
}
