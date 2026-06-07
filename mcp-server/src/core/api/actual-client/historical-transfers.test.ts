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

  it('correctly evaluates all permutations of flags using fast-check', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.oneof(fc.string(), fc.constant(undefined)),
        (tombstone, startingBalanceFlag, isParent, isChild, transferId) => {
          const tx: HistoricalTransferInternalTransaction = {
            ...baseTransaction,
            tombstone,
            starting_balance_flag: startingBalanceFlag,
            is_parent: isParent,
            is_child: isChild,
            transfer_id: transferId,
          };

          const expected =
            !tombstone && !startingBalanceFlag && !isParent && !isChild && !transferId;

          expect(isValidHistoricalTransferTransaction(tx)).toBe(expected);
        },
      ),
    );
  });
});
