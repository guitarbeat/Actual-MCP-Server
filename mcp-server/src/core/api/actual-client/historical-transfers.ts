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
