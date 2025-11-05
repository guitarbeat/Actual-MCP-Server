import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageAccountDataFetcher } from './data-fetcher.js';
import {
  createAccount,
  updateAccount,
  deleteAccount,
  closeAccount,
  reopenAccount,
  getAccountBalance,
} from '../../actual-api.js';

vi.mock('../../actual-api.js', () => ({
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  closeAccount: vi.fn(),
  reopenAccount: vi.fn(),
  getAccountBalance: vi.fn(),
}));

describe('ManageAccountDataFetcher', () => {
  const fetcher = new ManageAccountDataFetcher();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create operation', () => {
    it('should create account with required fields', async () => {
      vi.mocked(createAccount).mockResolvedValue('new-acc-id');

      const result = await fetcher.execute({
        operation: 'create',
        name: 'My Checking',
        type: 'checking',
      });

      expect(createAccount).toHaveBeenCalledWith({
        name: 'My Checking',
        type: 'checking',
      });
      expect(result).toEqual({
        accountId: 'new-acc-id',
        operation: 'create',
        details: {
          name: 'My Checking',
          type: 'checking',
          offbudget: undefined,
        },
      });
    });

    it('should create account with offbudget flag', async () => {
      vi.mocked(createAccount).mockResolvedValue('new-acc-id');

      const result = await fetcher.execute({
        operation: 'create',
        name: 'Investment',
        type: 'investment',
        offbudget: true,
      });

      expect(createAccount).toHaveBeenCalledWith({
        name: 'Investment',
        type: 'investment',
        offbudget: true,
      });
      expect(result.details?.offbudget).toBe(true);
    });

    it('should create account with initial balance', async () => {
      vi.mocked(createAccount).mockResolvedValue('new-acc-id');
      vi.mocked(updateAccount).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'create',
        name: 'Savings',
        type: 'savings',
        initialBalance: 100000,
      });

      expect(createAccount).toHaveBeenCalled();
      expect(updateAccount).toHaveBeenCalledWith('new-acc-id', { balance: 100000 });
      expect(result.accountId).toBe('new-acc-id');
    });

    it('should not set balance when initialBalance is zero', async () => {
      vi.mocked(createAccount).mockResolvedValue('new-acc-id');

      await fetcher.execute({
        operation: 'create',
        name: 'Checking',
        type: 'checking',
        initialBalance: 0,
      });

      expect(updateAccount).not.toHaveBeenCalled();
    });

    it('should throw error when name is missing', async () => {
      await expect(
        fetcher.execute({
          operation: 'create',
          type: 'checking',
        })
      ).rejects.toThrow('name and type are required for create operation');

      expect(createAccount).not.toHaveBeenCalled();
    });

    it('should throw error when type is missing', async () => {
      await expect(
        fetcher.execute({
          operation: 'create',
          name: 'Test Account',
        })
      ).rejects.toThrow('name and type are required for create operation');

      expect(createAccount).not.toHaveBeenCalled();
    });
  });

  describe('update operation', () => {
    it('should update account with partial fields', async () => {
      vi.mocked(updateAccount).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'update',
        id: 'acc-123',
        name: 'Updated Name',
      });

      expect(updateAccount).toHaveBeenCalledWith('acc-123', {
        name: 'Updated Name',
      });
      expect(result).toEqual({
        accountId: 'acc-123',
        operation: 'update',
        details: {
          name: 'Updated Name',
          type: undefined,
          offbudget: undefined,
        },
      });
    });

    it('should update account type', async () => {
      vi.mocked(updateAccount).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'update',
        id: 'acc-123',
        type: 'savings',
      });

      expect(updateAccount).toHaveBeenCalledWith('acc-123', {
        type: 'savings',
      });
      expect(result.details?.type).toBe('savings');
    });

    it('should update offbudget status', async () => {
      vi.mocked(updateAccount).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'update',
        id: 'acc-123',
        offbudget: true,
      });

      expect(updateAccount).toHaveBeenCalledWith('acc-123', {
        offbudget: true,
      });
      expect(result.details?.offbudget).toBe(true);
    });

    it('should update multiple fields', async () => {
      vi.mocked(updateAccount).mockResolvedValue(undefined);

      await fetcher.execute({
        operation: 'update',
        id: 'acc-123',
        name: 'New Name',
        type: 'credit',
        offbudget: false,
      });

      expect(updateAccount).toHaveBeenCalledWith('acc-123', {
        name: 'New Name',
        type: 'credit',
        offbudget: false,
      });
    });

    it('should throw error when id is missing', async () => {
      await expect(
        fetcher.execute({
          operation: 'update',
          name: 'Test',
        })
      ).rejects.toThrow('id is required for update operation');

      expect(updateAccount).not.toHaveBeenCalled();
    });
  });

  describe('delete operation', () => {
    it('should delete account with valid ID', async () => {
      vi.mocked(deleteAccount).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'delete',
        id: 'acc-123',
      });

      expect(deleteAccount).toHaveBeenCalledWith('acc-123');
      expect(result).toEqual({
        accountId: 'acc-123',
        operation: 'delete',
      });
    });

    it('should throw error when id is missing', async () => {
      await expect(
        fetcher.execute({
          operation: 'delete',
        })
      ).rejects.toThrow('id is required for delete operation');

      expect(deleteAccount).not.toHaveBeenCalled();
    });

    it('should handle API deletion failure', async () => {
      vi.mocked(deleteAccount).mockRejectedValue(new Error('Account not found'));

      await expect(
        fetcher.execute({
          operation: 'delete',
          id: 'non-existent-id',
        })
      ).rejects.toThrow('Account not found');
    });
  });

  describe('close operation', () => {
    it('should close account without transfer', async () => {
      vi.mocked(closeAccount).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'close',
        id: 'acc-123',
      });

      expect(closeAccount).toHaveBeenCalledWith('acc-123');
      expect(result).toEqual({
        accountId: 'acc-123',
        operation: 'close',
        details: {
          closed: true,
          transferredTo: undefined,
        },
      });
    });

    it('should close account with transfer', async () => {
      vi.mocked(closeAccount).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'close',
        id: 'acc-123',
        transferAccountId: 'acc-456',
      });

      expect(closeAccount).toHaveBeenCalledWith('acc-123');
      expect(result).toEqual({
        accountId: 'acc-123',
        operation: 'close',
        details: {
          closed: true,
          transferredTo: 'acc-456',
        },
      });
    });

    it('should throw error when id is missing', async () => {
      await expect(
        fetcher.execute({
          operation: 'close',
        })
      ).rejects.toThrow('id is required for close operation');

      expect(closeAccount).not.toHaveBeenCalled();
    });
  });

  describe('reopen operation', () => {
    it('should reopen account with valid ID', async () => {
      vi.mocked(reopenAccount).mockResolvedValue(undefined);

      const result = await fetcher.execute({
        operation: 'reopen',
        id: 'acc-123',
      });

      expect(reopenAccount).toHaveBeenCalledWith('acc-123');
      expect(result).toEqual({
        accountId: 'acc-123',
        operation: 'reopen',
        details: {
          closed: false,
        },
      });
    });

    it('should throw error when id is missing', async () => {
      await expect(
        fetcher.execute({
          operation: 'reopen',
        })
      ).rejects.toThrow('id is required for reopen operation');

      expect(reopenAccount).not.toHaveBeenCalled();
    });
  });

  describe('balance query operation', () => {
    it('should query account balance', async () => {
      vi.mocked(getAccountBalance).mockResolvedValue(50000);

      const result = await fetcher.execute({
        operation: 'balance',
        id: 'acc-123',
      });

      expect(getAccountBalance).toHaveBeenCalledWith('acc-123', undefined);
      expect(result).toEqual({
        accountId: 'acc-123',
        operation: 'balance',
        balance: 50000,
      });
    });

    it('should query account balance with date', async () => {
      vi.mocked(getAccountBalance).mockResolvedValue(75000);

      const result = await fetcher.execute({
        operation: 'balance',
        id: 'acc-123',
        date: '2024-01-15',
      });

      expect(getAccountBalance).toHaveBeenCalledWith('acc-123', '2024-01-15');
      expect(result.balance).toBe(75000);
    });

    it('should throw error when id is missing', async () => {
      await expect(
        fetcher.execute({
          operation: 'balance',
        })
      ).rejects.toThrow('id is required for balance operation');

      expect(getAccountBalance).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle unknown operation', async () => {
      await expect(
        fetcher.execute({
          operation: 'unknown' as any,
        })
      ).rejects.toThrow('Unknown operation: unknown');
    });

    it('should propagate API errors for create', async () => {
      vi.mocked(createAccount).mockRejectedValue(new Error('API error'));

      await expect(
        fetcher.execute({
          operation: 'create',
          name: 'Test',
          type: 'checking',
        })
      ).rejects.toThrow('API error');
    });

    it('should propagate API errors for update', async () => {
      vi.mocked(updateAccount).mockRejectedValue(new Error('Update failed'));

      await expect(
        fetcher.execute({
          operation: 'update',
          id: 'acc-123',
          name: 'Test',
        })
      ).rejects.toThrow('Update failed');
    });
  });
});
