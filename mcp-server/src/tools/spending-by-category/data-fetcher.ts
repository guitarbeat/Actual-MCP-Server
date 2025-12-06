// Fetches accounts, categories, groups, and transactions for spending-by-category tool
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAllCategories, fetchAllCategoryGroups } from '../../core/data/fetch-categories.js';
import { fetchAllOnBudgetTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Account, Category, CategoryGroup, Transaction } from '../../core/types/domain.js';
import { resolveAccountSelection } from '../../core/utils/account-selector.js';

export class SpendingByCategoryDataFetcher {
  /**
   * Fetch all required data for the spending-by-category tool.
   * If accountId is provided, only fetch transactions for that account.
   */
  async fetchAll(
    accountId: string | undefined,
    start: string,
    end: string
  ): Promise<{
    accounts: Account[];
    categories: Category[];
    categoryGroups: CategoryGroup[];
    transactions: Transaction[];
  }> {
    const accounts = await fetchAllAccounts();
    const categories = await fetchAllCategories();
    const categoryGroups = await fetchAllCategoryGroups();

    let transactions: Transaction[] = [];
    const { accountId: resolvedAccountId } = await resolveAccountSelection(accounts, accountId);

    if (resolvedAccountId) {
      transactions = await fetchTransactionsForAccount(resolvedAccountId, start, end, { accountIdIsResolved: true });
    } else {
      transactions = await fetchAllOnBudgetTransactions(accounts, start, end);
    }
    return { accounts, categories, categoryGroups, transactions };
  }
}
