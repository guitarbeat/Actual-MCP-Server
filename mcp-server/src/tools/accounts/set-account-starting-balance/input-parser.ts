import { SetAccountStartingBalanceArgsSchema } from './types.js';
import type { SetAccountStartingBalanceArgs } from './types.js';

function convertAmountToCents(amount: number): number {
  const absAmount = Math.abs(amount);

  if (absAmount >= 1000) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

export class SetAccountStartingBalanceInputParser {
  parse(args: unknown): SetAccountStartingBalanceArgs {
    const validated = SetAccountStartingBalanceArgsSchema.parse(args);

    return {
      account: validated.account,
      amountCents: convertAmountToCents(validated.amount),
      date: validated.date,
      notes: validated.notes,
    };
  }
}
