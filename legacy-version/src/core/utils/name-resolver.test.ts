import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NameResolver } from './name-resolver.js';

// Mock the data fetching modules
vi.mock('../data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

vi.mock('../data/fetch-categories.js', () => ({
  fetchAllCategories: vi.fn(),
}));

vi.mock('../data/fetch-payees.js', () => ({
  fetchAllPayees: vi.fn(),
}));

import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { fetchAllCategories } from '../data/fetch-categories.js';
import { fetchAllPayees } from '../data/fetch-payees.js';

describe('NameResolver', () => {
  let resolver: NameResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new NameResolver();
  });

  describe('resolveAccount', () => {
    it('should pass through UUID-like IDs', async () => {
      const uuid = 'abc-123-def-456';
      const result = await resolver.resolveAccount(uuid);
      expect(result).toBe(uuid);
      expect(fetchAllAccounts).not.toHaveBeenCalled();
    });

    it('should pass through long alphanumeric IDs', async () => {
      const id = 'abcdefghijklmnopqrstuvwxyz123456';
      const result = await resolver.resolveAccount(id);
      expect(result).toBe(id);
      expect(fetchAllAccounts).not.toHaveBeenCalled();
    });

    it('should resolve account name to ID', async () => {
      const mockAccounts = [
        { id: 'account-1', name: 'Checking', type: 'checking' },
        { id: 'account-2', name: 'Savings', type: 'savings' },
      ];
      vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);

      const result = await resolver.resolveAccount('Checking');

      expect(result).toBe('account-1');
      expect(fetchAllAccounts).toHaveBeenCalledOnce();
    });

    it('should resolve account name case-insensitively', async () => {
      const mockAccounts = [{ id: 'account-1', name: 'Checking', type: 'checking' }];
      vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);

      const result = await resolver.resolveAccount('checking');

      expect(result).toBe('account-1');
    });

    it('should cache resolved account names', async () => {
      const mockAccounts = [{ id: 'account-1', name: 'Checking', type: 'checking' }];
      vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);

      // First call
      const result1 = await resolver.resolveAccount('Checking');
      // Second call - should use cache
      const result2 = await resolver.resolveAccount('Checking');

      expect(result1).toBe('account-1');
      expect(result2).toBe('account-1');
      expect(fetchAllAccounts).toHaveBeenCalledOnce();
    });

    it('should throw error for unknown account with helpful message', async () => {
      const mockAccounts = [
        { id: 'account-1', name: 'Checking', type: 'checking' },
        { id: 'account-2', name: 'Savings', type: 'savings' },
      ];
      vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);

      await expect(resolver.resolveAccount('Unknown')).rejects.toThrow(
        "Account 'Unknown' not found. Available accounts: Checking, Savings"
      );
    });

    it('should handle empty account list', async () => {
      vi.mocked(fetchAllAccounts).mockResolvedValue([]);

      await expect(resolver.resolveAccount('Any')).rejects.toThrow("Account 'Any' not found. Available accounts: none");
    });
  });

  describe('resolveCategory', () => {
    it('should pass through UUID-like IDs', async () => {
      const uuid = 'cat-123-def-456';
      const result = await resolver.resolveCategory(uuid);
      expect(result).toBe(uuid);
      expect(fetchAllCategories).not.toHaveBeenCalled();
    });

    it('should resolve category name to ID', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Groceries', group_id: 'group-1' },
        { id: 'cat-2', name: 'Dining', group_id: 'group-1' },
      ];
      vi.mocked(fetchAllCategories).mockResolvedValue(mockCategories);

      const result = await resolver.resolveCategory('Groceries');

      expect(result).toBe('cat-1');
      expect(fetchAllCategories).toHaveBeenCalledOnce();
    });

    it('should resolve category name case-insensitively', async () => {
      const mockCategories = [{ id: 'cat-1', name: 'Groceries', group_id: 'group-1' }];
      vi.mocked(fetchAllCategories).mockResolvedValue(mockCategories);

      const result = await resolver.resolveCategory('groceries');

      expect(result).toBe('cat-1');
    });

    it('should cache resolved category names', async () => {
      const mockCategories = [{ id: 'cat-1', name: 'Groceries', group_id: 'group-1' }];
      vi.mocked(fetchAllCategories).mockResolvedValue(mockCategories);

      const result1 = await resolver.resolveCategory('Groceries');
      const result2 = await resolver.resolveCategory('Groceries');

      expect(result1).toBe('cat-1');
      expect(result2).toBe('cat-1');
      expect(fetchAllCategories).toHaveBeenCalledOnce();
    });

    it('should throw error for unknown category with helpful message', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Groceries', group_id: 'group-1' },
        { id: 'cat-2', name: 'Dining', group_id: 'group-1' },
      ];
      vi.mocked(fetchAllCategories).mockResolvedValue(mockCategories);

      await expect(resolver.resolveCategory('Unknown')).rejects.toThrow(
        "Category 'Unknown' not found. Available categories: Groceries, Dining"
      );
    });
  });

  describe('resolvePayee', () => {
    it('should pass through UUID-like IDs', async () => {
      const uuid = 'payee-123-def-456';
      const result = await resolver.resolvePayee(uuid);
      expect(result).toBe(uuid);
      expect(fetchAllPayees).not.toHaveBeenCalled();
    });

    it('should resolve payee name to ID', async () => {
      const mockPayees = [
        { id: 'payee-1', name: 'Walmart' },
        { id: 'payee-2', name: 'Target' },
      ];
      vi.mocked(fetchAllPayees).mockResolvedValue(mockPayees);

      const result = await resolver.resolvePayee('Walmart');

      expect(result).toBe('payee-1');
      expect(fetchAllPayees).toHaveBeenCalledOnce();
    });

    it('should resolve payee name case-insensitively', async () => {
      const mockPayees = [{ id: 'payee-1', name: 'Walmart' }];
      vi.mocked(fetchAllPayees).mockResolvedValue(mockPayees);

      const result = await resolver.resolvePayee('walmart');

      expect(result).toBe('payee-1');
    });

    it('should cache resolved payee names', async () => {
      const mockPayees = [{ id: 'payee-1', name: 'Walmart' }];
      vi.mocked(fetchAllPayees).mockResolvedValue(mockPayees);

      const result1 = await resolver.resolvePayee('Walmart');
      const result2 = await resolver.resolvePayee('Walmart');

      expect(result1).toBe('payee-1');
      expect(result2).toBe('payee-1');
      expect(fetchAllPayees).toHaveBeenCalledOnce();
    });

    it('should throw error for unknown payee with helpful message', async () => {
      const mockPayees = [
        { id: 'payee-1', name: 'Walmart' },
        { id: 'payee-2', name: 'Target' },
      ];
      vi.mocked(fetchAllPayees).mockResolvedValue(mockPayees);

      await expect(resolver.resolvePayee('Unknown')).rejects.toThrow(
        "Payee 'Unknown' not found. Available payees: Walmart, Target"
      );
    });
  });

  describe('clearCache', () => {
    it('should clear all cached mappings', async () => {
      const mockAccounts = [{ id: 'account-1', name: 'Checking', type: 'checking' }];
      const mockCategories = [{ id: 'cat-1', name: 'Groceries', group_id: 'group-1' }];
      const mockPayees = [{ id: 'payee-1', name: 'Walmart' }];

      vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
      vi.mocked(fetchAllCategories).mockResolvedValue(mockCategories);
      vi.mocked(fetchAllPayees).mockResolvedValue(mockPayees);

      // Populate cache
      await resolver.resolveAccount('Checking');
      await resolver.resolveCategory('Groceries');
      await resolver.resolvePayee('Walmart');

      expect(fetchAllAccounts).toHaveBeenCalledOnce();
      expect(fetchAllCategories).toHaveBeenCalledOnce();
      expect(fetchAllPayees).toHaveBeenCalledOnce();

      // Clear cache
      resolver.clearCache();

      // Should fetch again after cache clear
      await resolver.resolveAccount('Checking');
      await resolver.resolveCategory('Groceries');
      await resolver.resolvePayee('Walmart');

      expect(fetchAllAccounts).toHaveBeenCalledTimes(2);
      expect(fetchAllCategories).toHaveBeenCalledTimes(2);
      expect(fetchAllPayees).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearCacheForType', () => {
    it('should clear only account cache', async () => {
      const mockAccounts = [{ id: 'account-1', name: 'Checking', type: 'checking' }];
      const mockCategories = [{ id: 'cat-1', name: 'Groceries', group_id: 'group-1' }];

      vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
      vi.mocked(fetchAllCategories).mockResolvedValue(mockCategories);

      await resolver.resolveAccount('Checking');
      await resolver.resolveCategory('Groceries');

      resolver.clearCacheForType('account');

      await resolver.resolveAccount('Checking');
      await resolver.resolveCategory('Groceries');

      expect(fetchAllAccounts).toHaveBeenCalledTimes(2);
      expect(fetchAllCategories).toHaveBeenCalledOnce();
    });

    it('should clear only category cache', async () => {
      const mockAccounts = [{ id: 'account-1', name: 'Checking', type: 'checking' }];
      const mockCategories = [{ id: 'cat-1', name: 'Groceries', group_id: 'group-1' }];

      vi.mocked(fetchAllAccounts).mockResolvedValue(mockAccounts);
      vi.mocked(fetchAllCategories).mockResolvedValue(mockCategories);

      await resolver.resolveAccount('Checking');
      await resolver.resolveCategory('Groceries');

      resolver.clearCacheForType('category');

      await resolver.resolveAccount('Checking');
      await resolver.resolveCategory('Groceries');

      expect(fetchAllAccounts).toHaveBeenCalledOnce();
      expect(fetchAllCategories).toHaveBeenCalledTimes(2);
    });

    it('should clear only payee cache', async () => {
      const mockCategories = [{ id: 'cat-1', name: 'Groceries', group_id: 'group-1' }];
      const mockPayees = [{ id: 'payee-1', name: 'Walmart' }];

      vi.mocked(fetchAllCategories).mockResolvedValue(mockCategories);
      vi.mocked(fetchAllPayees).mockResolvedValue(mockPayees);

      await resolver.resolveCategory('Groceries');
      await resolver.resolvePayee('Walmart');

      resolver.clearCacheForType('payee');

      await resolver.resolveCategory('Groceries');
      await resolver.resolvePayee('Walmart');

      expect(fetchAllCategories).toHaveBeenCalledOnce();
      expect(fetchAllPayees).toHaveBeenCalledTimes(2);
    });
  });
});
