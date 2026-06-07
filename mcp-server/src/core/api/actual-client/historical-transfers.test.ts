import { describe, expect, it, vi } from 'vitest';
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
  const mockSend = vi.fn();
  const mockGetTransaction = vi.fn();
  const mockAll = vi.fn();

  const validInternal = {
    send: mockSend,
    db: {
      getTransaction: mockGetTransaction,
      all: mockAll,
    },
  };

  it('returns send and db when dependencies are present', () => {
    const api = { internal: validInternal } as unknown as ExtendedActualApi;
    const result = getHistoricalTransferInternalLayer(api);
    expect(result.send).toBe(mockSend);
    expect(result.db).toBe(validInternal.db);
  });

  it('throws an error if internal is undefined', () => {
    const api = {} as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access',
    );
  });

  it('throws an error if internal.send is missing', () => {
    const api = { internal: { ...validInternal, send: undefined } } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access',
    );
  });

  it('throws an error if internal.db is missing', () => {
    const api = { internal: { send: mockSend } } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access',
    );
  });

  it('throws an error if internal.db.getTransaction is missing', () => {
    const api = {
      internal: {
        send: mockSend,
        db: { all: mockAll },
      },
    } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access',
    );
  });

  it('throws an error if internal.db.all is missing', () => {
    const api = {
      internal: {
        send: mockSend,
        db: { getTransaction: mockGetTransaction },
      },
    } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access',
    );
  });
});
