import { describe, it, expect } from 'vitest';
import { isValidHistoricalTransferTransaction } from './historical-transfers.js';
import type { HistoricalTransferInternalTransaction } from './types.js';

describe('isValidHistoricalTransferTransaction', () => {
  const baseTransaction: HistoricalTransferInternalTransaction = {
    id: 'tx_1',
    account: 'acct_1',
    amount: 100,
    date: '2023-01-01',
  };

  it('returns false for null', () => {
    expect(isValidHistoricalTransferTransaction(null)).toBe(false);
  });

  it('returns true for a valid transaction with no flags', () => {
    expect(isValidHistoricalTransferTransaction(baseTransaction)).toBe(true);
  });

  it('returns true for a valid transaction with explicitly falsy flags', () => {
    expect(
      isValidHistoricalTransferTransaction({
        ...baseTransaction,
        tombstone: false,
        starting_balance_flag: false,
        is_parent: false,
        is_child: false,
        transfer_id: null,
      }),
    ).toBe(true);
  });

  it('returns false if tombstone is true', () => {
    expect(
      isValidHistoricalTransferTransaction({
        ...baseTransaction,
        tombstone: true,
      }),
    ).toBe(false);
  });

  it('returns false if starting_balance_flag is true', () => {
    expect(
      isValidHistoricalTransferTransaction({
        ...baseTransaction,
        starting_balance_flag: true,
      }),
    ).toBe(false);
  });

  it('returns false if is_parent is true', () => {
    expect(
      isValidHistoricalTransferTransaction({
        ...baseTransaction,
        is_parent: true,
      }),
    ).toBe(false);
  });

  it('returns false if is_child is true', () => {
    expect(
      isValidHistoricalTransferTransaction({
        ...baseTransaction,
        is_child: true,
      }),
    ).toBe(false);
  });

  it('returns false if transfer_id is truthy', () => {
    expect(
      isValidHistoricalTransferTransaction({
        ...baseTransaction,
        transfer_id: 'transfer_1',
      }),
    ).toBe(false);
  });
});
