import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageTransactionInputParser } from './input-parser.js';
import { nameResolver } from '../../core/utils/name-resolver.js';

// Mock the name resolver
vi.mock('../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: vi.fn(),
    resolvePayee: vi.fn(),
    resolveCategory: vi.fn(),
  },
}));

describe('ManageTransactionInputParser', () => {
  const parser = new ManageTransactionInputParser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('delete operation', () => {
    it('should parse delete operation with valid ID', async () => {
      const result = await parser.parse({
        operation: 'delete',
        id: 'txn-123',
      });

      expect(result).toEqual({
        operation: 'delete',
        id: 'txn-123',
      });
    });

    it('should throw error when ID is missing for delete', async () => {
      await expect(
        parser.parse({
          operation: 'delete',
        })
      ).rejects.toThrow('id is required for delete operation');
    });

    it('should not require transaction object for delete', async () => {
      const result = await parser.parse({
        operation: 'delete',
        id: 'txn-456',
      });

      expect(result).toEqual({
        operation: 'delete',
        id: 'txn-456',
      });
      expect(nameResolver.resolveAccount).not.toHaveBeenCalled();
      expect(nameResolver.resolvePayee).not.toHaveBeenCalled();
      expect(nameResolver.resolveCategory).not.toHaveBeenCalled();
    });
  });

  describe('create operation', () => {
    it('should parse create operation with required fields', async () => {
      vi.mocked(nameResolver.resolveAccount).mockResolvedValue('account-id-123');

      const result = await parser.parse({
        operation: 'create',
        account: 'Checking',
        date: '2024-01-15',
        amount: -4599,
      });

      expect(result).toEqual({
        operation: 'create',
        id: undefined,
        accountId: 'account-id-123',
        date: '2024-01-15',
        amount: -4599,
      });
      expect(nameResolver.resolveAccount).toHaveBeenCalledWith('Checking');
    });

    it('should throw error when account is missing for create', async () => {
      await expect(
        parser.parse({
          operation: 'create',
          date: '2024-01-15',
        })
      ).rejects.toThrow('account is required for create operation');
    });

    it('should throw error when date is missing for create', async () => {
      await expect(
        parser.parse({
          operation: 'create',
          account: 'Checking',
        })
      ).rejects.toThrow('date is required for create operation');
    });
  });

  describe('update operation', () => {
    it('should parse update operation with ID', async () => {
      vi.mocked(nameResolver.resolvePayee).mockResolvedValue('payee-id-123');

      const result = await parser.parse({
        operation: 'update',
        id: 'txn-789',
        payee: 'Amazon',
        amount: -5000,
      });

      expect(result).toEqual({
        operation: 'update',
        id: 'txn-789',
        payeeId: 'payee-id-123',
        amount: -5000,
      });
      expect(nameResolver.resolvePayee).toHaveBeenCalledWith('Amazon');
    });

    it('should throw error when ID is missing for update', async () => {
      await expect(
        parser.parse({
          operation: 'update',
          amount: -5000,
        })
      ).rejects.toThrow('id is required for update operation');
    });
  });
});
