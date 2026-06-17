import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
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

describe('isValidHistoricalTransferTransaction - property-based tests', () => {
  it('returns true for any transaction with no disqualifying fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          account: fc.string({ minLength: 1 }),
          amount: fc.integer(),
          date: fc.constant('2024-01-01'),
        }),
        (tx) => {
          return isValidHistoricalTransferTransaction(tx) === true;
        },
      ),
    );
  });

  it('returns false for any transaction with tombstone=true', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          account: fc.string({ minLength: 1 }),
          amount: fc.integer(),
          date: fc.constant('2024-01-01'),
        }),
        (tx) => {
          return isValidHistoricalTransferTransaction({ ...tx, tombstone: true }) === false;
        },
      ),
    );
  });

  it('returns false for any transaction with starting_balance_flag=true', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          account: fc.string({ minLength: 1 }),
          amount: fc.integer(),
          date: fc.constant('2024-01-01'),
        }),
        (tx) => {
          return (
            isValidHistoricalTransferTransaction({ ...tx, starting_balance_flag: true }) === false
          );
        },
      ),
    );
  });

  it('returns false for any transaction with is_parent=true', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          account: fc.string({ minLength: 1 }),
          amount: fc.integer(),
          date: fc.constant('2024-01-01'),
        }),
        (tx) => {
          return isValidHistoricalTransferTransaction({ ...tx, is_parent: true }) === false;
        },
      ),
    );
  });

  it('returns false for any transaction with is_child=true', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          account: fc.string({ minLength: 1 }),
          amount: fc.integer(),
          date: fc.constant('2024-01-01'),
        }),
        (tx) => {
          return isValidHistoricalTransferTransaction({ ...tx, is_child: true }) === false;
        },
      ),
    );
  });

  it('returns false for any transaction with a non-empty transfer_id', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          account: fc.string({ minLength: 1 }),
          amount: fc.integer(),
          date: fc.constant('2024-01-01'),
        }),
        fc.string({ minLength: 1 }),
        (tx, transferId) => {
          return isValidHistoricalTransferTransaction({ ...tx, transfer_id: transferId }) === false;
        },
      ),
    );
  });
});

describe('getHistoricalTransferInternalLayer', () => {
  const send = async (_name: string, _args: Record<string, unknown>) => undefined;
  const db = {
    getTransaction: async (_id: string) => null,
    all: async (_sql: string, _params: unknown[]) => [],
  };

  it('throws when internal is missing entirely', () => {
    const api = {} as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access.',
    );
    expect(() => getHistoricalTransferInternalLayer(api)).toThrow();
  });

  it('throws when internal.send is missing', () => {
    const api = { internal: { db } } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access.',
    );
    expect(() => getHistoricalTransferInternalLayer(api)).toThrow();
  });

  it('throws when internal.db is missing', () => {
    const api = { internal: { send } } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access.',
    );
    expect(() => getHistoricalTransferInternalLayer(api)).toThrow();
  });

  it('throws when internal.db.getTransaction is missing', () => {
    const api = {
      internal: { send, db: { all: db.all } },
    } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access.',
    );
    expect(() => getHistoricalTransferInternalLayer(api)).toThrow();
  });

  it('throws when internal.db.all is missing', () => {
    const api = {
      internal: { send, db: { getTransaction: db.getTransaction } },
    } as unknown as ExtendedActualApi;
    expect(() => getHistoricalTransferInternalLayer(api)).toThrowError(
      'Historical transfer tools require Actual local data access.',
    );
    expect(() => getHistoricalTransferInternalLayer(api)).toThrow();
  });

  it('returns { send, db } when all required fields are present', () => {
    const api = { internal: { send, db } } as unknown as ExtendedActualApi;
    const result = getHistoricalTransferInternalLayer(api);
    expect(result.send).toBe(send);
    expect(result.db).toBe(db);
  });
});
