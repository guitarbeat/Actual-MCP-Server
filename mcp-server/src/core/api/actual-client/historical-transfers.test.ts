import { describe, expect, it } from 'vitest';
import {
  getHistoricalTransferInternalLayer,
  isValidHistoricalTransferTransaction,
} from './historical-transfers.js';
import type { ExtendedActualApi, HistoricalTransferInternalTransaction } from './types.js';

describe('isValidHistoricalTransferTransaction', () => {
  const baseTransaction: HistoricalTransferInternalTransaction = {
    id: 'tx1',
    account: 'acc1',
    amount: 1000,
    date: '2023-01-01',
  };

  it('returns false for null', () => {
    expect(isValidHistoricalTransferTransaction(null)).toBe(false);
  });

  it('returns true for a valid transaction', () => {
    expect(isValidHistoricalTransferTransaction(baseTransaction)).toBe(true);
  });

  it('returns false if tombstone is true', () => {
    expect(isValidHistoricalTransferTransaction({ ...baseTransaction, tombstone: true })).toBe(
      false,
    );
  });

  it('returns false if starting_balance_flag is true', () => {
    expect(
      isValidHistoricalTransferTransaction({ ...baseTransaction, starting_balance_flag: true }),
    ).toBe(false);
  });

  it('returns false if is_parent is true', () => {
    expect(isValidHistoricalTransferTransaction({ ...baseTransaction, is_parent: true })).toBe(
      false,
    );
  });

  it('returns false if is_child is true', () => {
    expect(isValidHistoricalTransferTransaction({ ...baseTransaction, is_child: true })).toBe(
      false,
    );
  });

  it('returns false if transfer_id is present', () => {
    expect(
      isValidHistoricalTransferTransaction({ ...baseTransaction, transfer_id: 'trans1' }),
    ).toBe(false);
  });
});

describe('getHistoricalTransferInternalLayer', () => {
  it('throws an error if internal is missing', () => {
    const api = {} as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access.',
    );
  });

  it('throws an error if internal.send is missing', () => {
    const api = {
      internal: {
        db: {
          getTransaction: async () => null,
          all: async () => [],
        },
      },
    } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access.',
    );
  });

  it('throws an error if internal.db.getTransaction is missing', () => {
    const api = {
      internal: {
        send: async () => ({}),
        db: {
          all: async () => [],
        },
      },
    } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access.',
    );
  });

  it('throws an error if internal.db.all is missing', () => {
    const api = {
      internal: {
        send: async () => ({}),
        db: {
          getTransaction: async () => null,
        },
      },
    } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access.',
    );
  });

  it('returns send and db if all required internal properties are present', () => {
    const mockSend = async () => ({});
    const mockDb = {
      getTransaction: async () => null,
      all: async () => [],
    };
    const api = {
      internal: {
        send: mockSend,
        db: mockDb,
      },
    } as unknown as ExtendedActualApi;

    const result = getHistoricalTransferInternalLayer(api);
    expect(result.send).toBe(mockSend);
    expect(result.db).toBe(mockDb);
  });
});
