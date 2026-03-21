export interface AccountDataWarning {
  accountId: string;
  accountName: string;
  operation: 'balances' | 'transactions';
  error: string;
}

export function formatAccountDataWarnings(warnings: AccountDataWarning[]): string[] {
  return warnings.map(
    ({ accountName, operation, error }) =>
      `${accountName}: ${operation} unavailable (${error || 'unknown error'})`,
  );
}
