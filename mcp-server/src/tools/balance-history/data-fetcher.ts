// Fetches accounts, transactions, and balances for balance-history tool

import { fetchAccountBalances } from '../../core/data/fetch-account-balances.js';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import {
  fetchAllTransactionsWithMetadata,
  fetchTransactionsForAccount,
} from '../../core/data/fetch-transactions.js';
import type { Account, Transaction } from '../../core/types/domain.js';
import { resolveAccountSelection } from '../../core/utils/account-selector.js';
import { formatAccountDataWarnings } from '../../core/utils/partial-results.js';

export class BalanceHistoryDataFetcher {
  async fetchAll(
    accountReference: string | undefined,
    start: string,
    end: string,
  ): Promise<{
    account: Account | undefined;
    accounts: Account[];
    transactions: Transaction[];
    warnings: string[];
  }> {
    const allAccounts = await fetchAllAccounts();
    const { accountId, account } = await resolveAccountSelection(allAccounts, accountReference);

    let accounts = allAccounts;
    let transactions: Transaction[] = [];
    let warnings: string[] = [];
    if (accountId && account) {
      const [txs, balanceResult] = await Promise.all([
        fetchTransactionsForAccount(accountId, start, end, {
          accountIdIsResolved: true,
        }),
        fetchAccountBalances([account]),
      ]);

      if (!(accountId in balanceResult.balancesByAccountId)) {
        throw new Error(`Unable to fetch balance for account '${account.name}'`);
      }

      transactions = txs;
      account.balance = balanceResult.balancesByAccountId[accountId];
    } else if (accountId) {
      transactions = await fetchTransactionsForAccount(accountId, start, end, {
        accountIdIsResolved: true,
      });
    } else {
      const [transactionResult, balanceResult] = await Promise.all([
        fetchAllTransactionsWithMetadata(allAccounts, start, end),
        fetchAccountBalances(allAccounts),
      ]);
      const successfulAccountIds = transactionResult.successfulAccountIds.filter((candidateId) =>
        balanceResult.successfulAccountIds.includes(candidateId),
      );
      const successfulAccountIdSet = new Set(successfulAccountIds);

      transactions = transactionResult.transactions.filter((transaction) =>
        successfulAccountIdSet.has(transaction.account),
      );
      warnings = formatAccountDataWarnings([
        ...transactionResult.warnings,
        ...balanceResult.warnings,
      ]);

      accounts = successfulAccountIds.reduce<Account[]>((resolvedAccounts, successfulAccountId) => {
        const resolvedAccount = allAccounts.find(
          (candidate) => candidate.id === successfulAccountId,
        );
        if (!resolvedAccount) {
          return resolvedAccounts;
        }

        resolvedAccounts.push({
          ...resolvedAccount,
          balance: balanceResult.balancesByAccountId[successfulAccountId],
        });
        return resolvedAccounts;
      }, []);
    }

    return { account, accounts, transactions, warnings };
  }
}
