import { shiftDateByDays, toActualDbDate } from '../../analysis/historical-transfer-utils.js';
import type { ExtendedActualApi, HistoricalTransferInternalTransaction } from './types.js';

export function getHistoricalTransferInternalLayer(extendedApi: ExtendedActualApi): {
  send: NonNullable<NonNullable<ExtendedActualApi['internal']>['send']>;
  db: NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>;
} {
  const { internal } = extendedApi;

  if (!internal?.send || !internal.db?.getTransaction || !internal.db?.all) {
    throw new Error(
      'Historical transfer tools require Actual local data access. This environment does not expose the internal Actual data layer needed to link existing transactions safely.',
    );
  }

  const { send, db } = internal;

  return {
    send,
    db,
  };
}

export function isValidHistoricalTransferTransaction(
  transaction: HistoricalTransferInternalTransaction | null,
): transaction is HistoricalTransferInternalTransaction {
  return Boolean(
    transaction &&
    !transaction.tombstone &&
    !transaction.starting_balance_flag &&
    !transaction.is_parent &&
    !transaction.is_child &&
    !transaction.transfer_id,
  );
}

export async function getHistoricalTransferCounterpartIds(
  db: NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>,
  transaction: HistoricalTransferInternalTransaction,
): Promise<string[]> {
  const rows = (await db.all(
    `SELECT id
       FROM v_transactions
      WHERE tombstone = 0
        AND id != ?
        AND (starting_balance_flag = 0 OR starting_balance_flag IS NULL)
        AND (is_parent = 0 OR is_parent IS NULL)
        AND (is_child = 0 OR is_child IS NULL)
        AND transfer_id IS NULL
        AND account != ?
        AND amount = ?
        AND date >= ?
        AND date <= ?`,
    [
      transaction.id,
      transaction.account,
      transaction.amount * -1,
      toActualDbDate(shiftDateByDays(transaction.date, -3)),
      toActualDbDate(shiftDateByDays(transaction.date, 3)),
    ],
  )) as Array<{ id: string }>;

  return rows.map((row) => row.id);
}

export async function getBatchHistoricalTransferTransactions(
  db: NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>,
  ids: string[],
): Promise<HistoricalTransferInternalTransaction[]> {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.all(
    `SELECT * FROM v_transactions WHERE id IN (${placeholders}) AND tombstone = 0`,
    ids,
  );

  return rows as unknown as HistoricalTransferInternalTransaction[];
}

export async function getAllPotentialHistoricalTransferCounterparts(
  db: NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>,
  transactions: HistoricalTransferInternalTransaction[],
): Promise<HistoricalTransferInternalTransaction[]> {
  if (transactions.length === 0) return [];

  const amounts = new Set<number>();
  let minDate = transactions[0].date;
  let maxDate = transactions[0].date;

  for (const tx of transactions) {
    amounts.add(tx.amount * -1);
    if (tx.date < minDate) minDate = tx.date;
    if (tx.date > maxDate) maxDate = tx.date;
  }

  const amountList = Array.from(amounts);
  const placeholders = amountList.map(() => '?').join(',');
  const startDate = toActualDbDate(shiftDateByDays(minDate, -3));
  const endDate = toActualDbDate(shiftDateByDays(maxDate, 3));

  const rows = await db.all(
    `SELECT *
       FROM v_transactions
      WHERE tombstone = 0
        AND (starting_balance_flag = 0 OR starting_balance_flag IS NULL)
        AND (is_parent = 0 OR is_parent IS NULL)
        AND (is_child = 0 OR is_child IS NULL)
        AND transfer_id IS NULL
        AND amount IN (${placeholders})
        AND date >= ?
        AND date <= ?`,
    [...amountList, startDate, endDate],
  );

  return rows as unknown as HistoricalTransferInternalTransaction[];
}
