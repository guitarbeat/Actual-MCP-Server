import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAllCategories } from '../../core/data/fetch-categories.js';
import {
  fetchAllOnBudgetTransactionsWithMetadata,
  fetchTransactionsForAccount,
} from '../../core/data/fetch-transactions.js';
import type { Account, Category, Transaction } from '../../core/types/domain.js';
import { resolveAccountSelection } from '../../core/utils/account-selector.js';
import { formatAccountDataWarnings } from '../../core/utils/partial-results.js';

export class MonthlySummaryDataFetcher {
  /**
   * Fetch accounts, categories, and all transactions for the given period.
   * If accountId is provided, only fetch transactions for that account.
   */
  async fetchAll(
    accountId: string | undefined,
    start: string,
    end: string,
  ): Promise<{
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    warnings: string[];
  }> {
    const accounts = await fetchAllAccounts();
    const categories = await fetchAllCategories();

    const { accountId: resolvedAccountId } = await resolveAccountSelection(accounts, accountId);

    let transactions: Transaction[] = [];
    let warnings: string[] = [];
    if (resolvedAccountId) {
      transactions = await fetchTransactionsForAccount(resolvedAccountId, start, end, {
        accountIdIsResolved: true,
      });
    } else {
      const result = await fetchAllOnBudgetTransactionsWithMetadata(accounts, start, end);
      transactions = result.transactions;
      warnings = formatAccountDataWarnings(result.warnings);
    }

    return { accounts, categories, transactions, warnings };
  }
}
