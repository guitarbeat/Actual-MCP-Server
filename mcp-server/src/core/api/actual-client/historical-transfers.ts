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

  const uniqueIds = [...new Set(ids)];
  const results: HistoricalTransferInternalTransaction[] = [];
  const chunkSize = 100;

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = (await db.all(
      `SELECT * FROM v_transactions WHERE id IN (${placeholders})`,
      chunk,
    )) as HistoricalTransferInternalTransaction[];
    results.push(...rows);
  }

  return results;
}

export async function getAllPotentialHistoricalTransferCounterparts(
  db: NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>,
  transactions: HistoricalTransferInternalTransaction[],
): Promise<Map<string, string[]>> {
  if (transactions.length === 0) return new Map();

  const amounts = [...new Set(transactions.map((tx) => tx.amount * -1))];
  const minDate = transactions.reduce(
    (min, tx) => (tx.date < min ? tx.date : min),
    transactions[0].date,
  );
  const maxDate = transactions.reduce(
    (max, tx) => (tx.date > max ? tx.date : max),
    transactions[0].date,
  );

  const windowMinDate = toActualDbDate(shiftDateByDays(minDate, -3));
  const windowMaxDate = toActualDbDate(shiftDateByDays(maxDate, 3));

  const resultsMap = new Map<string, string[]>();
  const chunkSize = 100;
  let allRows: Array<{ id: string; account: string; amount: number; date: string }> = [];

  for (let i = 0; i < amounts.length; i += chunkSize) {
    const chunk = amounts.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = (await db.all(
      `SELECT id, account, amount, date
         FROM v_transactions
        WHERE tombstone = 0
          AND (starting_balance_flag = 0 OR starting_balance_flag IS NULL)
          AND (is_parent = 0 OR is_parent IS NULL)
          AND (is_child = 0 OR is_child IS NULL)
          AND transfer_id IS NULL
          AND amount IN (${placeholders})
          AND date >= ?
          AND date <= ?`,
      [...chunk, windowMinDate, windowMaxDate],
    )) as Array<{ id: string; account: string; amount: number; date: string }>;
    allRows.push(...rows);
  }

  for (const tx of transactions) {
    const targetAmount = tx.amount * -1;
    const txMinDate = toActualDbDate(shiftDateByDays(tx.date, -3));
    const txMaxDate = toActualDbDate(shiftDateByDays(tx.date, 3));

    const matches = allRows
        .filter((row) => {
          const rowDbDate = toActualDbDate(row.date);
          return (
          row.id !== tx.id &&
          row.account !== tx.account &&
          row.amount === targetAmount &&
            rowDbDate >= txMinDate &&
            rowDbDate <= txMaxDate
          );
        })
      .map((row) => row.id);

    resultsMap.set(tx.id, matches);
  }

  return resultsMap;
}
