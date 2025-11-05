import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageAccountInputParser } from './input-parser.js';
import { nameResolver } from '../../core/utils/name-resolver.js';

// Mock the name resolver
vi.mock('../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: vi.fn(),
    resolveCategory: vi.fn(),
  },
}));

describe('ManageAccountInputParser', () => {
  const parser = new ManageAccountInputParser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('operation validation', () => {
    it('should accept valid create operation', async () => {
      const result = await parser.parse({
        operation: 'create',
        account: {
          name: 'Test Account',
          type: 'checking',
        },
      });

      expect(result.operation).toBe('create');
    });

    it('should accept valid update operation', async () => {
      const result = await parser.parse({
        operation: 'update',
        id: 'acc-123',
        account: {
          name: 'Updated Name',
        },
      });

      expect(result.operation).toBe('update');
    });

    it('should accept valid delete operation', async () => {
      const result = await parser.parse({
        operation: 'delete',
        id: 'acc-123',
      });

      expect(result.operation).toBe('delete');
    });

    it('should accept valid close operation', async () => {
      const result = await parser.parse({
        operation: 'close',
        id: 'acc-123',
      });

      expect(result.operation).toBe('close');
    });

    it('should accept valid reopen operation', async () => {
      const result = await parser.parse({
        operation: 'reopen',
        id: 'acc-123',
      });

      expect(result.operation).toBe('reopen');
    });

    it('should accept valid balance operation', async () => {
      const result = await parser.parse({
        operation: 'balance',
        id: 'acc-123',
      });

      expect(result.operation).toBe('balance');
    });

    it('should throw error for invalid operation', async () => {
      await expect(
        parser.parse({
          operation: 'invalid' as any,
        })
      ).rejects.toThrow("operation must be 'create', 'update', 'delete', 'close', 'reopen', or 'balance'");
    });

    it('should throw error for missing operation', async () => {
      await expect(parser.parse({} as any)).rejects.toThrow(
        "operation must be 'create', 'update', 'delete', 'close', 'reopen', or 'balance'"
      );
    });
  });

  describe('required field validation', () => {
    it('should require id for update operation', async () => {
      await expect(
        parser.parse({
          operation: 'update',
          account: { name: 'Test' },
        })
      ).rejects.toThrow('id is required for update operation');
    });

    it('should require id for delete operation', async () => {
      await expect(
        parser.parse({
          operation: 'delete',
        })
      ).rejects.toThrow('id is required for delete operation');
    });

    it('should require id for close operation', async () => {
      await expect(
        parser.parse({
          operation: 'close',
        })
      ).rejects.toThrow('id is required for close operation');
    });

    it('should require id for reopen operation', async () => {
      await expect(
        parser.parse({
          operation: 'reopen',
        })
      ).rejects.toThrow('id is required for reopen operation');
    });

    it('should require id for balance operation', async () => {
      await expect(
        parser.parse({
          operation: 'balance',
        })
      ).rejects.toThrow('id is required for balance operation');
    });

    it('should require account.name for create operation', async () => {
      await expect(
        parser.parse({
          operation: 'create',
          account: {
            type: 'checking',
          },
        })
      ).rejects.toThrow('account.name is required for create operation');
    });

    it('should require account.type for create operation', async () => {
      await expect(
        parser.parse({
          operation: 'create',
          account: {
            name: 'Test Account',
          },
        })
      ).rejects.toThrow('account.type is required for create operation');
    });
  });

  describe('account type validation', () => {
    const validTypes = ['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other'];

    validTypes.forEach((type) => {
      it(`should accept valid account type: ${type}`, async () => {
        const result = await parser.parse({
          operation: 'create',
          account: {
            name: 'Test Account',
            type: type as any,
          },
        });

        expect(result.type).toBe(type);
      });
    });

    it('should throw error for invalid account type', async () => {
      await expect(
        parser.parse({
          operation: 'create',
          account: {
            name: 'Test Account',
            type: 'invalid-type' as any,
          },
        })
      ).rejects.toThrow(
        "Invalid account type 'invalid-type'. Must be one of: checking, savings, credit, investment, mortgage, debt, other"
      );
    });

    it('should validate account type for update operation', async () => {
      await expect(
        parser.parse({
          operation: 'update',
          id: 'acc-123',
          account: {
            type: 'bad-type' as any,
          },
        })
      ).rejects.toThrow("Invalid account type 'bad-type'");
    });
  });

  describe('transferAccountId validation for close', () => {
    it('should resolve transferAccountId when provided', async () => {
      vi.mocked(nameResolver.resolveAccount).mockResolvedValue('resolved-acc-id');

      const result = await parser.parse({
        operation: 'close',
        id: 'acc-123',
        transferAccountId: 'Savings Account',
      });

      expect(nameResolver.resolveAccount).toHaveBeenCalledWith('Savings Account');
      expect(result.transferAccountId).toBe('resolved-acc-id');
    });

    it('should resolve transferCategoryId when provided', async () => {
      vi.mocked(nameResolver.resolveCategory).mockResolvedValue('resolved-cat-id');

      const result = await parser.parse({
        operation: 'close',
        id: 'acc-123',
        transferCategoryId: 'Transfer Category',
      });

      expect(nameResolver.resolveCategory).toHaveBeenCalledWith('Transfer Category');
      expect(result.transferCategoryId).toBe('resolved-cat-id');
    });

    it('should handle close without transfer accounts', async () => {
      const result = await parser.parse({
        operation: 'close',
        id: 'acc-123',
      });

      expect(result.transferAccountId).toBeUndefined();
      expect(result.transferCategoryId).toBeUndefined();
      expect(nameResolver.resolveAccount).not.toHaveBeenCalled();
      expect(nameResolver.resolveCategory).not.toHaveBeenCalled();
    });
  });

  describe('delete operation', () => {
    it('should parse delete operation with valid ID', async () => {
      const result = await parser.parse({
        operation: 'delete',
        id: 'acc-123',
      });

      expect(result).toEqual({
        operation: 'delete',
        id: 'acc-123',
      });
    });

    it('should not require account object for delete', async () => {
      const result = await parser.parse({
        operation: 'delete',
        id: 'acc-456',
      });

      expect(result).toEqual({
        operation: 'delete',
        id: 'acc-456',
      });
      expect(nameResolver.resolveAccount).not.toHaveBeenCalled();
    });
  });

  describe('reopen operation', () => {
    it('should parse reopen operation with valid ID', async () => {
      const result = await parser.parse({
        operation: 'reopen',
        id: 'acc-789',
      });

      expect(result).toEqual({
        operation: 'reopen',
        id: 'acc-789',
      });
    });
  });

  describe('balance operation', () => {
    it('should parse balance operation with ID', async () => {
      const result = await parser.parse({
        operation: 'balance',
        id: 'acc-123',
      });

      expect(result).toEqual({
        operation: 'balance',
        id: 'acc-123',
      });
    });

    it('should parse balance operation with date', async () => {
      const result = await parser.parse({
        operation: 'balance',
        id: 'acc-123',
        date: '2024-01-15',
      });

      expect(result).toEqual({
        operation: 'balance',
        id: 'acc-123',
        date: '2024-01-15',
      });
    });
  });

  describe('create operation', () => {
    it('should parse create operation with required fields', async () => {
      const result = await parser.parse({
        operation: 'create',
        account: {
          name: 'My Checking',
          type: 'checking',
        },
      });

      expect(result).toEqual({
        operation: 'create',
        id: undefined,
        name: 'My Checking',
        type: 'checking',
      });
    });

    it('should parse create operation with offbudget flag', async () => {
      const result = await parser.parse({
        operation: 'create',
        account: {
          name: 'Investment Account',
          type: 'investment',
          offbudget: true,
        },
      });

      expect(result).toEqual({
        operation: 'create',
        id: undefined,
        name: 'Investment Account',
        type: 'investment',
        offbudget: true,
      });
    });

    it('should parse create operation with initialBalance', async () => {
      const result = await parser.parse({
        operation: 'create',
        account: {
          name: 'Savings',
          type: 'savings',
        },
        initialBalance: 100000,
      });

      expect(result).toEqual({
        operation: 'create',
        id: undefined,
        name: 'Savings',
        type: 'savings',
        initialBalance: 100000,
      });
    });
  });

  describe('update operation', () => {
    it('should parse update operation with partial fields', async () => {
      const result = await parser.parse({
        operation: 'update',
        id: 'acc-123',
        account: {
          name: 'Updated Name',
        },
      });

      expect(result).toEqual({
        operation: 'update',
        id: 'acc-123',
        name: 'Updated Name',
      });
    });

    it('should parse update operation with type change', async () => {
      const result = await parser.parse({
        operation: 'update',
        id: 'acc-123',
        account: {
          type: 'savings',
        },
      });

      expect(result).toEqual({
        operation: 'update',
        id: 'acc-123',
        type: 'savings',
      });
    });

    it('should parse update operation with offbudget change', async () => {
      const result = await parser.parse({
        operation: 'update',
        id: 'acc-123',
        account: {
          offbudget: true,
        },
      });

      expect(result).toEqual({
        operation: 'update',
        id: 'acc-123',
        offbudget: true,
      });
    });
  });
});
