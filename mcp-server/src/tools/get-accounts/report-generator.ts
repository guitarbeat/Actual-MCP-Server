/**
 * Report generator for get-accounts tool
 * Formats account data for display
 */

import { formatAmount } from '../../core/formatting/index.js';
import type { AccountWithBalance } from './data-fetcher.js';

export interface FormattedAccount {
  id: string;
  name: string;
  type: string;
  balance: string;
  reportedBalance?: string;
  closed: boolean;
  offBudget: boolean;
}

export interface GetAccountsReport {
  accounts: FormattedAccount[];
  partial: boolean;
  warnings: string[];
}

export function generateAccountsReport(
  accounts: AccountWithBalance[],
  warnings: string[] = [],
): GetAccountsReport {
  return {
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type || 'Account',
      balance: formatAmount(account.balance),
      ...(account.balance_current != null
        ? { reportedBalance: formatAmount(account.balance_current) }
        : {}),
      closed: account.closed ?? false,
      offBudget: account.offbudget ?? false,
    })),
    partial: warnings.length > 0,
    warnings,
  };
}
