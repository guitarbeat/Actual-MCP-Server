import { getAccountBalance } from '../api/actual-client.js';
import type { Account } from '../types/domain.js';
import { mapSettledWithConcurrency } from '../utils/concurrency.js';
import type { AccountDataWarning } from '../utils/partial-results.js';

export interface AccountBalanceResult {
  balancesByAccountId: Record<string, number>;
  successfulAccountIds: string[];
  warnings: AccountDataWarning[];
}

const ACCOUNT_BALANCE_CONCURRENCY = 4;

export async function fetchAccountBalances(
  accounts: Account[],
  options: { date?: string } = {},
): Promise<AccountBalanceResult> {
  if (accounts.length === 0) {
    return {
      balancesByAccountId: {},
      successfulAccountIds: [],
      warnings: [],
    };
  }

  const startTime = Date.now();
  const results = await mapSettledWithConcurrency(
    accounts,
    (account) => getAccountBalance(account.id, options.date),
    ACCOUNT_BALANCE_CONCURRENCY,
  );

  const balancesByAccountId: Record<string, number> = {};
  const successfulAccountIds: string[] = [];
  const warnings: AccountDataWarning[] = [];

  results.forEach((result, index) => {
    const account = accounts[index];

    if (result.status === 'fulfilled') {
      balancesByAccountId[account.id] = result.value;
      successfulAccountIds.push(account.id);
      return;
    }

    const reason =
      result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'unknown');
    warnings.push({
      accountId: account.id,
      accountName: account.name,
      operation: 'balances',
      error: reason,
    });
  });

  if (process.env.PERFORMANCE_LOGGING_ENABLED !== 'false') {
    console.error(
      `[PERF] Account balances fetched for ${successfulAccountIds.length}/${accounts.length} accounts in ${Date.now() - startTime}ms`,
    );
  }

  if (warnings.length > 0) {
    console.error('[BALANCES] Partial failures while fetching account balances:', warnings);
  }

  return {
    balancesByAccountId,
    successfulAccountIds,
    warnings,
  };
}
