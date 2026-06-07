import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { isValidHistoricalTransferTransaction } from './historical-transfers.js';
import type { HistoricalTransferInternalTransaction } from './types.js';

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

  it('returns expected boolean for various permutations of flags', () => {
    fc.assert(
      fc.property(
        fc.record(
          {
            tombstone: fc.boolean(),
            starting_balance_flag: fc.boolean(),
            is_parent: fc.boolean(),
            is_child: fc.boolean(),
            transfer_id: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
          },
          { requiredKeys: [] },
        ),
        (flags) => {
          const transaction = {
            ...baseTransaction,
            ...flags,
          };

          const expected = Boolean(
            !flags.tombstone &&
            !flags.starting_balance_flag &&
            !flags.is_parent &&
            !flags.is_child &&
            !flags.transfer_id,
          );

          expect(isValidHistoricalTransferTransaction(transaction)).toBe(expected);
        },
      ),
    );
  });
});
