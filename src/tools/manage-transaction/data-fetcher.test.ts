import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageTransactionDataFetcher } from './data-fetcher.js';
import { deleteTransaction, importTransactions, updateTransaction } from '../../actual-api.js';

vi.mock('../../actual-api.js', () => ({
  deleteTransaction: vi.fn(),
  importTransactions: vi.fn(),
  updateTransaction: vi.fn(),
}));

describe('ManageTransactionDataFetcher', () => {
  const fetcher = new ManageTransactionDataFetcher();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('delete operation', () => {
    it('should delete transaction with valid ID', async () => {
      vi.mocked(deleteTransaction).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'delete',
        id: 'txn-123',
      });

      expect(deleteTransaction).toHaveBeenCalledWith('txn-123');
      expect(result).toEqual({
        transactionId: 'txn-123',
        operation: 'delete',
      });
    });

    it('should throw error when ID is missing for delete', async () => {
      await expect(
        fetcher.execute({
          operation: 'delete',
        })
      ).rejects.toThrow('id is required for delete operation');

      expect(deleteTransaction).not.toHaveBeenCalled();
    });

    it('should handle API deletion failure', async () => {
      vi.mocked(deleteTransaction).mockRejectedValue(new Error('Transaction not found'));

      await expect(
        fetcher.execute({
          operation: 'delete',
          id: 'non-existent-id',
        })
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('create operation', () => {
    it('should create transaction successfully with uncleared default', async () => {
      vi.mocked(importTransactions).mockResolvedValue({
        added: ['new-txn-id'],
        updated: [],
      });

      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234567890);

      const result = await fetcher.execute({
        operation: 'create',
        accountId: 'account-123',
        date: '2024-01-15',
        amount: -4599,
      });

      expect(importTransactions).toHaveBeenCalledWith('account-123', [
        expect.objectContaining({
          cleared: false,
          imported_id: 'manual-account-123-2024-01-15--4599-1234567890',
        }),
      ]);
      expect(result).toEqual({
        transactionId: 'new-txn-id',
        operation: 'create',
      });

      nowSpy.mockRestore();
    });

    it('should surface errors returned from importTransactions', async () => {
      vi.mocked(importTransactions).mockResolvedValue({
        added: [],
        updated: [],
        errors: [{ message: 'duplicate transaction detected' }],
      });

      await expect(
        fetcher.execute({
          operation: 'create',
          accountId: 'account-123',
          date: '2024-01-15',
          amount: -4599,
        })
      ).rejects.toThrow('Failed to create transaction: duplicate transaction detected');
    });

    it('should throw error when accountId is missing for create', async () => {
      await expect(
        fetcher.execute({
          operation: 'create',
          date: '2024-01-15',
        })
      ).rejects.toThrow('accountId and date are required for create operation');
    });
  });

  describe('update operation', () => {
    it('should update transaction successfully', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'update',
        id: 'txn-456',
        amount: -5000,
      });

      expect(updateTransaction).toHaveBeenCalledWith('txn-456', {
        amount: -5000,
      });
      expect(result).toEqual({
        transactionId: 'txn-456',
        operation: 'update',
      });
    });

    it('should throw error when ID is missing for update', async () => {
      await expect(
        fetcher.execute({
          operation: 'update',
          amount: -5000,
        })
      ).rejects.toThrow('id is required for update operation');
    });
  });
});
