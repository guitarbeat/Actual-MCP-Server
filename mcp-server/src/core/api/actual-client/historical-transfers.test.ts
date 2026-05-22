import { describe, it, expect } from 'vitest';
import { isValidHistoricalTransferTransaction } from './historical-transfers.js';
import type { HistoricalTransferInternalTransaction } from './types.js';

describe('isValidHistoricalTransferTransaction', () => {
  const baseTransaction: HistoricalTransferInternalTransaction = {
    id: 'tx-1',
    account: 'acct-1',
    amount: 1000,
    date: '2024-01-01',
  };

  it('should return true for a valid transaction with undefined flags', () => {
    expect(isValidHistoricalTransferTransaction(baseTransaction)).toBe(true);
  });

  it('should return true for a valid transaction with explicit false/null flags', () => {
    const validTx: HistoricalTransferInternalTransaction = {
      ...baseTransaction,
      tombstone: false,
      starting_balance_flag: null,
      is_parent: false,
      is_child: null,
      transfer_id: null,
    };
    expect(isValidHistoricalTransferTransaction(validTx)).toBe(true);
  });

  it('should return false if transaction is null', () => {
    expect(isValidHistoricalTransferTransaction(null)).toBe(false);
  });

  it('should return false if tombstone is true', () => {
    expect(isValidHistoricalTransferTransaction({ ...baseTransaction, tombstone: true })).toBe(
      false,
    );
  });

  it('should return false if starting_balance_flag is true', () => {
    expect(
      isValidHistoricalTransferTransaction({ ...baseTransaction, starting_balance_flag: true }),
    ).toBe(false);
  });

  it('should return false if is_parent is true', () => {
    expect(isValidHistoricalTransferTransaction({ ...baseTransaction, is_parent: true })).toBe(
      false,
    );
  });

  it('should return false if is_child is true', () => {
    expect(isValidHistoricalTransferTransaction({ ...baseTransaction, is_child: true })).toBe(
      false,
    );
  });

  it('should return false if transfer_id is present', () => {
    expect(isValidHistoricalTransferTransaction({ ...baseTransaction, transfer_id: 'tx-2' })).toBe(
      false,
    );
  });
});
