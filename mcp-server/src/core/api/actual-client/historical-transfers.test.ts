import { describe, it, expect, vi } from 'vitest';
import {
  getHistoricalTransferInternalLayer,
  isValidHistoricalTransferTransaction,
  getHistoricalTransferCounterpartIds,
  getBatchHistoricalTransferTransactions,
  getAllPotentialHistoricalTransferCounterparts,
} from './historical-transfers.js';
import type { ExtendedActualApi, HistoricalTransferInternalTransaction } from './types.js';

describe('historical-transfers', () => {
  describe('getHistoricalTransferInternalLayer', () => {
    it('returns send and db from extendedApi when valid', () => {
      const dbMock = {
        getTransaction: vi.fn(),
        all: vi.fn(),
      };
      const sendMock = vi.fn();

      const api = {
        internal: {
          send: sendMock,
          db: dbMock,
        },
      } as unknown as ExtendedActualApi;

      const result = getHistoricalTransferInternalLayer(api);
      expect(result.send).toBe(sendMock);
      expect(result.db).toBe(dbMock);
    });

    it('throws error when internal is missing', () => {
      expect(() => getHistoricalTransferInternalLayer({} as ExtendedActualApi)).toThrow(
        /Historical transfer tools require Actual local data access/,
      );
    });

    it('throws error when send is missing', () => {
      const api = {
        internal: {
          db: { getTransaction: vi.fn(), all: vi.fn() },
        },
      } as unknown as ExtendedActualApi;
      expect(() => getHistoricalTransferInternalLayer(api)).toThrow(
        /Historical transfer tools require Actual local data access/,
      );
    });

    it('throws error when getTransaction is missing', () => {
      const api = {
        internal: {
          send: vi.fn(),
          db: { all: vi.fn() },
        },
      } as unknown as ExtendedActualApi;
      expect(() => getHistoricalTransferInternalLayer(api)).toThrow(
        /Historical transfer tools require Actual local data access/,
      );
    });

    it('throws error when all is missing', () => {
      const api = {
        internal: {
          send: vi.fn(),
          db: { getTransaction: vi.fn() },
        },
      } as unknown as ExtendedActualApi;
      expect(() => getHistoricalTransferInternalLayer(api)).toThrow(
        /Historical transfer tools require Actual local data access/,
      );
    });
  });

  describe('isValidHistoricalTransferTransaction', () => {
    it('returns true for a valid transaction', () => {
      const tx = {
        id: 'tx1',
        amount: 100,
        date: '2024-01-01',
        account: 'acct1',
      } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidHistoricalTransferTransaction(null)).toBe(false);
    });

    it('returns false if tombstone is true', () => {
      const tx = {
        id: 'tx1',
        amount: 100,
        date: '2024-01-01',
        account: 'acct1',
        tombstone: true,
      } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });

    it('returns false if starting_balance_flag is true', () => {
      const tx = {
        id: 'tx1',
        amount: 100,
        date: '2024-01-01',
        account: 'acct1',
        starting_balance_flag: true,
      } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });

    it('returns false if is_parent is true', () => {
      const tx = {
        id: 'tx1',
        amount: 100,
        date: '2024-01-01',
        account: 'acct1',
        is_parent: true,
      } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });

    it('returns false if is_child is true', () => {
      const tx = {
        id: 'tx1',
        amount: 100,
        date: '2024-01-01',
        account: 'acct1',
        is_child: true,
      } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });

    it('returns false if transfer_id is present', () => {
      const tx = {
        id: 'tx1',
        amount: 100,
        date: '2024-01-01',
        account: 'acct1',
        transfer_id: 'some_id',
      } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });
  });

  describe('getHistoricalTransferCounterpartIds', () => {
    it('calls db.all with correct SQL and params and returns ids', async () => {
      const mockDb = {
        all: vi.fn().mockResolvedValue([{ id: 'xyz' }]),
      } as unknown as NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>;

      const tx = {
        id: 'tx1',
        account: 'acc1',
        amount: 1000,
        date: '2024-01-05',
      } as HistoricalTransferInternalTransaction;

      const ids = await getHistoricalTransferCounterpartIds(mockDb, tx);

      expect(ids).toEqual(['xyz']);
      expect(mockDb.all).toHaveBeenCalledWith(
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
        ['tx1', 'acc1', -1000, 20240102, 20240108],
      );
    });
  });

  describe('getBatchHistoricalTransferTransactions', () => {
    it('returns empty array immediately if ids array is empty', async () => {
      const mockDb = {
        all: vi.fn(),
      } as unknown as NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>;

      const result = await getBatchHistoricalTransferTransactions(mockDb, []);
      expect(result).toEqual([]);
      expect(mockDb.all).not.toHaveBeenCalled();
    });

    it('calls db.all with correct placeholders and returns transactions', async () => {
      const mockDb = {
        all: vi.fn().mockResolvedValue([{ id: 'tx1' }, { id: 'tx2' }]),
      } as unknown as NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>;

      const result = await getBatchHistoricalTransferTransactions(mockDb, ['tx1', 'tx2']);

      expect(result).toEqual([{ id: 'tx1' }, { id: 'tx2' }]);
      expect(mockDb.all).toHaveBeenCalledWith(
        `SELECT * FROM v_transactions WHERE id IN (?,?) AND tombstone = 0`,
        ['tx1', 'tx2'],
      );
    });
  });

  describe('getAllPotentialHistoricalTransferCounterparts', () => {
    it('returns empty array immediately if transactions array is empty', async () => {
      const mockDb = {
        all: vi.fn(),
      } as unknown as NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>;

      const result = await getAllPotentialHistoricalTransferCounterparts(mockDb, []);
      expect(result).toEqual([]);
      expect(mockDb.all).not.toHaveBeenCalled();
    });

    it('calls db.all with correct query for negated unique amounts and date ranges', async () => {
      const mockDb = {
        all: vi.fn().mockResolvedValue([{ id: 'match1' }]),
      } as unknown as NonNullable<NonNullable<NonNullable<ExtendedActualApi['internal']>['db']>>;

      const txs = [
        { id: 'tx1', amount: 1000, date: '2024-01-05', account: 'acc1' },
        { id: 'tx2', amount: -500, date: '2024-01-01', account: 'acc1' },
      ] as HistoricalTransferInternalTransaction[];

      const result = await getAllPotentialHistoricalTransferCounterparts(mockDb, txs);

      expect(result).toEqual([{ id: 'match1' }]);

      expect(mockDb.all).toHaveBeenCalledWith(
        `SELECT *
       FROM v_transactions
      WHERE tombstone = 0
        AND (starting_balance_flag = 0 OR starting_balance_flag IS NULL)
        AND (is_parent = 0 OR is_parent IS NULL)
        AND (is_child = 0 OR is_child IS NULL)
        AND transfer_id IS NULL
        AND amount IN (?,?)
        AND date >= ?
        AND date <= ?`,
        [-1000, 500, 20231229, 20240108],
      );
    });
  });
});
