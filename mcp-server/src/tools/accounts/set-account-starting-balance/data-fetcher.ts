import { format, parseISO, subDays } from 'date-fns';
import { importTransactions, updateTransaction } from '../../../core/api/actual-client.js';
import { fetchAllAccounts } from '../../../core/data/fetch-accounts.js';
import { fetchTransactionsForAccount } from '../../../core/data/fetch-transactions.js';
import { nameResolver } from '../../../core/utils/name-resolver.js';
import type {
  SetAccountStartingBalanceArgs,
  StartingBalancePlan,
  StartingBalanceResult,
  StartingBalanceTransaction,
} from './types.js';

const STARTING_BALANCE_CATEGORY_NAME = 'Starting Balances';
const TRANSACTION_FETCH_START = '1900-01-01';
const TRANSACTION_FETCH_END = '2999-12-31';

function getDefaultEffectiveDate(transactions: StartingBalanceTransaction[]): string {
  if (transactions.length === 0) {
    return format(new Date(), 'yyyy-MM-dd');
  }

  const earliestTransaction = [...transactions].sort((left, right) =>
    left.date.localeCompare(right.date),
  )[0];

  return format(subDays(parseISO(earliestTransaction.date), 1), 'yyyy-MM-dd');
}

function getWarnings(duplicateTransactionIds: string[]): string[] {
  if (duplicateTransactionIds.length === 0) {
    return [];
  }

  return [
    `Multiple starting balance transactions already exist. Updated the oldest one and left ${duplicateTransactionIds.length} duplicate transaction(s) untouched.`,
  ];
}

export class SetAccountStartingBalanceDataFetcher {
  async buildPlan(args: SetAccountStartingBalanceArgs): Promise<StartingBalancePlan> {
    const accountId = await nameResolver.resolveAccount(args.account);
    const categoryId = await nameResolver.resolveCategory(STARTING_BALANCE_CATEGORY_NAME);
    const accounts = await fetchAllAccounts();
    const account = accounts.find((candidate) => candidate.id === accountId);

    if (!account) {
      throw new Error(`Account '${args.account}' could not be loaded.`);
    }

    const transactions = (await fetchTransactionsForAccount(
      accountId,
      TRANSACTION_FETCH_START,
      TRANSACTION_FETCH_END,
      { accountIdIsResolved: true },
    )) as StartingBalanceTransaction[];

    const startingBalanceTransactions = transactions
      .filter((transaction) => transaction.starting_balance_flag)
      .sort((left, right) => left.date.localeCompare(right.date));
    const nonStartingBalanceTransactions = transactions.filter(
      (transaction) => !transaction.starting_balance_flag && !transaction.is_child,
    );
    const primaryStartingBalance = startingBalanceTransactions[0];

    return {
      accountId,
      accountName: account.name,
      amountCents: args.amountCents,
      effectiveDate: args.date ?? getDefaultEffectiveDate(nonStartingBalanceTransactions),
      categoryId,
      notes: args.notes ?? primaryStartingBalance?.notes ?? 'Starting balance',
      existingTransactionId: primaryStartingBalance?.id,
      duplicateTransactionIds: startingBalanceTransactions.slice(1).map((transaction) => transaction.id),
    };
  }

  async applyPlan(plan: StartingBalancePlan): Promise<StartingBalanceResult> {
    const transactionPayload = {
      date: plan.effectiveDate,
      amount: plan.amountCents,
      category: plan.categoryId,
      notes: plan.notes,
      payee: null,
      cleared: true,
      starting_balance_flag: true,
    };

    if (plan.existingTransactionId) {
      await updateTransaction(plan.existingTransactionId, transactionPayload);

      return {
        accountId: plan.accountId,
        accountName: plan.accountName,
        transactionId: plan.existingTransactionId,
        action: 'updated',
        effectiveDate: plan.effectiveDate,
        amountCents: plan.amountCents,
        duplicateTransactionIds: plan.duplicateTransactionIds,
        warnings: getWarnings(plan.duplicateTransactionIds),
      };
    }

    const importResult = await importTransactions(
      plan.accountId,
      [
        {
          date: plan.effectiveDate,
          amount: plan.amountCents,
          category: plan.categoryId,
          notes: plan.notes,
          cleared: true,
          imported_id: `starting-balance-${plan.accountId}-${Date.now()}`,
        },
      ],
      { defaultCleared: true },
    );
    const transactionId = importResult.added[0] || importResult.updated[0];

    if (!transactionId) {
      throw new Error('Actual did not return a transaction ID for the starting balance update.');
    }

    await updateTransaction(transactionId, { starting_balance_flag: true });

    return {
      accountId: plan.accountId,
      accountName: plan.accountName,
      transactionId,
      action: 'created',
      effectiveDate: plan.effectiveDate,
      amountCents: plan.amountCents,
      duplicateTransactionIds: [],
      warnings: [],
    };
  }
}
