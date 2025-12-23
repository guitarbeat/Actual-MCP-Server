// Fetches accounts, transactions, and balances for balance-history tool

import { getAccountBalance } from '../../actual-api.js';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAllTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Account, Transaction } from '../../core/types/domain.js';
import { resolveAccountSelection } from '../../core/utils/account-selector.js';

export class BalanceHistoryDataFetcher {
  async fetchAll(
    accountReference: string | undefined,
    start: string,
    end: string
  ): Promise<{
    account: Account | undefined;
    accounts: Account[];
    transactions: Transaction[];
  }> {
    const accounts = await fetchAllAccounts();
    const { accountId, account } = await resolveAccountSelection(accounts, accountReference);

    let transactions: Transaction[] = [];
    if (accountId && account) {
      // # Reason: Fetch transactions and balance in parallel for single account
      const [txs, balance] = await Promise.all([
        fetchTransactionsForAccount(accountId, start, end, {
          accountIdIsResolved: true,
        }),
        getAccountBalance(accountId),
      ]);
      transactions = txs;
      account.balance = balance;
    } else if (accountId) {
      transactions = await fetchTransactionsForAccount(accountId, start, end, {
        accountIdIsResolved: true,
      });
    } else {
      // # Reason: Fetch transactions and all account balances in parallel
      const [txs, balances] = await Promise.all([
        fetchAllTransactions(accounts, start, end),
        Promise.all(accounts.map((a) => getAccountBalance(a.id))),
      ]);
      transactions = txs;
      // # Reason: Assign balances to corresponding accounts
      accounts.forEach((a, index) => {
        a.balance = balances[index];
      });
    }

    return { account, accounts, transactions };
  }
}
