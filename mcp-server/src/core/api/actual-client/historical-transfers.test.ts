import { describe, expect, it, vi } from 'vitest';
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
    it('should throw if internal is missing', () => {
      const api = {} as ExtendedActualApi;
      expect(() => getHistoricalTransferInternalLayer(api)).toThrow(
        /Historical transfer tools require Actual local data access/
      );
    });

    it('should throw if internal.send is missing', () => {
      const api = {
        internal: {
          db: { getTransaction: vi.fn(), all: vi.fn() }
        }
      } as unknown as ExtendedActualApi;
      expect(() => getHistoricalTransferInternalLayer(api)).toThrow(
        /Historical transfer tools require Actual local data access/
      );
    });

    it('should throw if internal.db is missing', () => {
      const api = {
        internal: {
          send: vi.fn()
        }
      } as unknown as ExtendedActualApi;
      expect(() => getHistoricalTransferInternalLayer(api)).toThrow(
        /Historical transfer tools require Actual local data access/
      );
    });

    it('should throw if internal.db.getTransaction is missing', () => {
      const api = {
        internal: {
          send: vi.fn(),
          db: { all: vi.fn() }
        }
      } as unknown as ExtendedActualApi;
      expect(() => getHistoricalTransferInternalLayer(api)).toThrow(
        /Historical transfer tools require Actual local data access/
      );
    });

    it('should throw if internal.db.all is missing', () => {
      const api = {
        internal: {
          send: vi.fn(),
          db: { getTransaction: vi.fn() }
        }
      } as unknown as ExtendedActualApi;
      expect(() => getHistoricalTransferInternalLayer(api)).toThrow(
        /Historical transfer tools require Actual local data access/
      );
    });

    it('should return send and db if all dependencies are present', () => {
      const sendMock = vi.fn();
      const dbMock = { getTransaction: vi.fn(), all: vi.fn() };

      const api = {
        internal: {
          send: sendMock,
          db: dbMock
        }
      } as unknown as ExtendedActualApi;

      const result = getHistoricalTransferInternalLayer(api);

      expect(result.send).toBe(sendMock);
      expect(result.db).toBe(dbMock);
    });
  });

  describe('isValidHistoricalTransferTransaction', () => {
    it('should return false for null', () => {
      expect(isValidHistoricalTransferTransaction(null)).toBe(false);
    });

    it('should return false if tombstone is true', () => {
      const tx = { id: '1', tombstone: true } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });

    it('should return false if starting_balance_flag is true', () => {
      const tx = { id: '1', starting_balance_flag: true } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });

    it('should return false if is_parent is true', () => {
      const tx = { id: '1', is_parent: true } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });

    it('should return false if is_child is true', () => {
      const tx = { id: '1', is_child: true } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });

    it('should return false if transfer_id is set', () => {
      const tx = { id: '1', transfer_id: 'tx_2' } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(false);
    });

    it('should return true for valid transaction', () => {
      const tx = {
        id: '1',
        account: 'acct_1',
        amount: 100,
        date: '2023-01-01'
      } as HistoricalTransferInternalTransaction;
      expect(isValidHistoricalTransferTransaction(tx)).toBe(true);
    });
  });

  describe('getHistoricalTransferCounterpartIds', () => {
    it('should query db with correct parameters', async () => {
      const mockDb = {
        all: vi.fn().mockResolvedValue([{ id: 'tx_2' }, { id: 'tx_3' }]),
        getTransaction: vi.fn(),
      };

      const tx = {
        id: 'tx_1',
        account: 'acct_1',
        amount: 500,
        date: '2023-01-05'
      } as HistoricalTransferInternalTransaction;

      const ids = await getHistoricalTransferCounterpartIds(mockDb as any, tx);

      expect(ids).toEqual(['tx_2', 'tx_3']);
      expect(mockDb.all).toHaveBeenCalledTimes(1);

      const callArgs = mockDb.all.mock.calls[0];
      expect(callArgs[0]).toContain('SELECT id');
      expect(callArgs[1]).toEqual([
        'tx_1',
        'acct_1',
        -500,
        20230102,
        20230108,
      ]);
    });
  });

  describe('getBatchHistoricalTransferTransactions', () => {
    it('should return empty array if ids is empty', async () => {
      const db = { all: vi.fn().mockResolvedValue([]) } as any;
      const results = await getBatchHistoricalTransferTransactions(db, []);
      expect(results).toEqual([]);
      expect(db.all).not.toHaveBeenCalled();
    });

    it('should query db for all provided ids', async () => {
      const mockRows = [{ id: 'tx_1' }, { id: 'tx_2' }];
      const mockDb = {
        all: vi.fn().mockImplementation(async (sql, params) => {
          if (sql.includes('IN (?,?)')) return mockRows;
          return [];
        }),
        getTransaction: vi.fn(),
      };

      const results = await getBatchHistoricalTransferTransactions(mockDb as any, ['tx_1', 'tx_2']);
      expect(results).toEqual(mockRows);
      expect(mockDb.all).toHaveBeenCalledTimes(1);
      expect(mockDb.all.mock.calls[0][1]).toEqual(['tx_1', 'tx_2']);
    });
  });

  describe('getAllPotentialHistoricalTransferCounterparts', () => {
    it('should return empty array if transactions is empty', async () => {
      const db = { all: vi.fn().mockResolvedValue([]) } as any;
      const results = await getAllPotentialHistoricalTransferCounterparts(db, []);
      expect(results).toEqual([]);
      expect(db.all).not.toHaveBeenCalled();
    });

    it('should query db with correct parameters for multiple transactions', async () => {
      const mockRows = [{ id: 'tx_3' }];
      const mockDb = {
        all: vi.fn().mockResolvedValue(mockRows),
        getTransaction: vi.fn(),
      };

      const txs = [
        { id: 'tx_1', amount: 100, date: '2023-01-10' },
        { id: 'tx_2', amount: -50, date: '2023-01-12' }
      ] as HistoricalTransferInternalTransaction[];

      const results = await getAllPotentialHistoricalTransferCounterparts(mockDb as any, txs);

      expect(results).toEqual(mockRows);
      expect(mockDb.all).toHaveBeenCalledTimes(1);

      const callArgs = mockDb.all.mock.calls[0];
      expect(callArgs[0]).toContain('IN (?,?)');
      expect(callArgs[1]).toEqual([
        -100,
        50,
        20230107,
        20230115,
      ]);
    });
  });
});
