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
  closed: boolean;
  offBudget: boolean;
}

export class GetAccountsReportGenerator {
  /**
   * Generate formatted account data
   *
   * @param accounts - Array of accounts with balances
   * @returns Array of formatted account objects
   */
  generate(accounts: AccountWithBalance[]): FormattedAccount[] {
    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type || 'Account',
      balance: formatAmount(account.balance),
      closed: account.closed ?? false,
      offBudget: account.offbudget ?? false,
    }));
  }
}
