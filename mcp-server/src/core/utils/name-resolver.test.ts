import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NameResolver } from './name-resolver.js';
import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { fetchAllCategories } from '../data/fetch-categories.js';
import { fetchAllPayees } from '../data/fetch-payees.js';
import type { Account, Category, Payee } from '../types/domain.js';

// Mock dependencies
vi.mock('../data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

vi.mock('../data/fetch-categories.js', () => ({
  fetchAllCategories: vi.fn(),
}));

vi.mock('../data/fetch-payees.js', () => ({
  fetchAllPayees: vi.fn(),
}));

describe('NameResolver', () => {
  let resolver: NameResolver;

  beforeEach(() => {
    resolver = new NameResolver();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('resolveAccount', () => {
    it('should pass through if input is already an ID', async () => {
      const id = 'acc-123';
      const result = await resolver.resolveAccount(id);
      expect(result).toBe(id);
      expect(fetchAllAccounts).not.toHaveBeenCalled();
    });

    it('should return cached ID if name is in cache', async () => {
      // Manually populate cache for testing private property access or simulate warmed cache
      // Since cache is private, we can simulate by mocking fetchAllAccounts to return a value
      vi.mocked(fetchAllAccounts).mockResolvedValue([
        { id: 'acc-1', name: 'Checking' },
      ] as Account[]);

      await resolver.resolveAccount('Checking');

      // Reset mock to verify it's not called again
      vi.mocked(fetchAllAccounts).mockClear();

      const result = await resolver.resolveAccount('Checking');
      expect(result).toBe('acc-1');
      expect(fetchAllAccounts).not.toHaveBeenCalled();
    });

    it('should fetch accounts and resolve name if not in cache', async () => {
      vi.mocked(fetchAllAccounts).mockResolvedValue([
        { id: 'acc-1', name: 'Checking' },
        { id: 'acc-2', name: 'Savings' },
      ] as Account[]);

      const result = await resolver.resolveAccount('Savings');
      expect(result).toBe('acc-2');
      expect(fetchAllAccounts).toHaveBeenCalledTimes(1);
    });

    it('should match names case-insensitively and ignoring emojis', async () => {
      vi.mocked(fetchAllAccounts).mockResolvedValue([
        { id: 'acc-1', name: '💰 Savings Account' },
      ] as Account[]);

      const result = await resolver.resolveAccount('savings account');
      expect(result).toBe('acc-1');
    });

    it('should throw error if account not found', async () => {
      vi.mocked(fetchAllAccounts).mockResolvedValue([
        { id: 'acc-1', name: 'Checking' },
      ] as Account[]);

      await expect(resolver.resolveAccount('Investments')).rejects.toThrow(
        "Account 'Investments' not found. Available accounts: Checking",
      );
    });
  });

  describe('resolveCategory', () => {
    it('should pass through if input is already an ID', async () => {
      const id = 'cat-123';
      const result = await resolver.resolveCategory(id);
      expect(result).toBe(id);
      expect(fetchAllCategories).not.toHaveBeenCalled();
    });

    it('should resolve name by fetching categories', async () => {
      vi.mocked(fetchAllCategories).mockResolvedValue([
        { id: 'cat-1', name: 'Food', group_id: 'grp-1' },
        { id: 'cat-2', name: 'Rent', group_id: 'grp-2' },
      ] as Category[]);

      const result = await resolver.resolveCategory('Rent');
      expect(result).toBe('cat-2');
      expect(fetchAllCategories).toHaveBeenCalledTimes(1);
    });

    it('should use cache for subsequent lookups', async () => {
      vi.mocked(fetchAllCategories).mockResolvedValue([
        { id: 'cat-1', name: 'Food', group_id: 'grp-1' },
      ] as Category[]);

      await resolver.resolveCategory('Food');
      vi.mocked(fetchAllCategories).mockClear();

      const result = await resolver.resolveCategory('Food');
      expect(result).toBe('cat-1');
      expect(fetchAllCategories).not.toHaveBeenCalled();
    });

    it('should throw error if category not found', async () => {
      vi.mocked(fetchAllCategories).mockResolvedValue([
        { id: 'cat-1', name: 'Food', group_id: 'grp-1' },
      ] as Category[]);

      await expect(resolver.resolveCategory('Travel')).rejects.toThrow(
        "Category 'Travel' not found. Available categories: Food",
      );
    });
  });

  describe('resolvePayee', () => {
    it('should pass through if input is already an ID', async () => {
      const id = 'pay-123';
      const result = await resolver.resolvePayee(id);
      expect(result).toBe(id);
      expect(fetchAllPayees).not.toHaveBeenCalled();
    });

    it('should resolve name by fetching payees', async () => {
      vi.mocked(fetchAllPayees).mockResolvedValue([
        { id: 'pay-1', name: 'Grocery Store' },
        { id: 'pay-2', name: 'Landlord' },
      ] as Payee[]);

      const result = await resolver.resolvePayee('Landlord');
      expect(result).toBe('pay-2');
      expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    });

    it('should use cache for subsequent lookups', async () => {
      vi.mocked(fetchAllPayees).mockResolvedValue([
        { id: 'pay-1', name: 'Grocery Store' },
      ] as Payee[]);

      await resolver.resolvePayee('Grocery Store');
      vi.mocked(fetchAllPayees).mockClear();

      const result = await resolver.resolvePayee('Grocery Store');
      expect(result).toBe('pay-1');
      expect(fetchAllPayees).not.toHaveBeenCalled();
    });

    it('should throw error if payee not found', async () => {
      vi.mocked(fetchAllPayees).mockResolvedValue([
        { id: 'pay-1', name: 'Grocery Store' },
      ] as Payee[]);

      await expect(resolver.resolvePayee('Netflix')).rejects.toThrow(
        "Payee 'Netflix' not found. Available payees: Grocery Store",
      );
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', async () => {
      // Populate caches
      vi.mocked(fetchAllAccounts).mockResolvedValue([{ id: 'acc-1', name: 'A1' }] as Account[]);
      vi.mocked(fetchAllCategories).mockResolvedValue([
        { id: 'cat-1', name: 'C1', group_id: 'g1' },
      ] as Category[]);
      vi.mocked(fetchAllPayees).mockResolvedValue([{ id: 'pay-1', name: 'P1' }] as Payee[]);

      await resolver.resolveAccount('A1');
      await resolver.resolveCategory('C1');
      await resolver.resolvePayee('P1');

      // Clear caches
      resolver.clearCache();

      // Verify fetches happen again
      vi.mocked(fetchAllAccounts).mockClear();
      vi.mocked(fetchAllCategories).mockClear();
      vi.mocked(fetchAllPayees).mockClear();

      await resolver.resolveAccount('A1');
      await resolver.resolveCategory('C1');
      await resolver.resolvePayee('P1');

      expect(fetchAllAccounts).toHaveBeenCalledTimes(1);
      expect(fetchAllCategories).toHaveBeenCalledTimes(1);
      expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    });

    it('should clear specific cache type', async () => {
      // Populate caches
      vi.mocked(fetchAllAccounts).mockResolvedValue([{ id: 'acc-1', name: 'A1' }] as Account[]);
      vi.mocked(fetchAllCategories).mockResolvedValue([
        { id: 'cat-1', name: 'C1', group_id: 'g1' },
      ] as Category[]);

      await resolver.resolveAccount('A1');
      await resolver.resolveCategory('C1');

      // Clear only account cache
      resolver.clearCacheForType('account');

      // Verify account fetch happens again, but category does not
      vi.mocked(fetchAllAccounts).mockClear();
      vi.mocked(fetchAllCategories).mockClear();

      await resolver.resolveAccount('A1');
      await resolver.resolveCategory('C1');

      expect(fetchAllAccounts).toHaveBeenCalledTimes(1);
      expect(fetchAllCategories).not.toHaveBeenCalled();
    });
  });
});
