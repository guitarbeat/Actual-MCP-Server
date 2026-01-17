import api from '@actual-app/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as actualApi from '../../actual-api.js';
import { cacheService } from '../cache/cache-service.js';

// Mock the @actual-app/api module
vi.mock('@actual-app/api', () => ({
  default: {
    init: vi.fn(),
    getBudgets: vi.fn(),
    downloadBudget: vi.fn(),
    shutdown: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    closeAccount: vi.fn(),
    reopenAccount: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    createCategoryGroup: vi.fn(),
    updateCategoryGroup: vi.fn(),
    deleteCategoryGroup: vi.fn(),
    createPayee: vi.fn(),
    updatePayee: vi.fn(),
    deletePayee: vi.fn(),
    mergePayees: vi.fn(),
  },
}));

describe('Cache Invalidation Tests', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheService.clear();
    vi.clearAllMocks();

    // Mock successful API initialization
    vi.mocked(api.getBudgets).mockResolvedValue([
      {
        id: 'test-budget',
        cloudFileId: 'test-cloud-id',
        name: 'Test Budget',
      } as any,
    ]);
    vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Account Operations', () => {
    it('should invalidate accounts cache after createAccount', async () => {
      // Setup
      vi.mocked(api.createAccount).mockResolvedValue('new-account-id');
      cacheService.set('accounts:all', [{ id: 'existing' }]);

      // Execute
      await actualApi.createAccount({ name: 'New Account' });

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate accounts cache after updateAccount', async () => {
      // Setup
      vi.mocked(api.updateAccount).mockResolvedValue(undefined);
      cacheService.set('accounts:all', [{ id: 'account-1' }]);

      // Execute
      await actualApi.updateAccount('account-1', { name: 'Updated' });

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate accounts cache after deleteAccount', async () => {
      // Setup
      vi.mocked(api.deleteAccount).mockResolvedValue(undefined);
      cacheService.set('accounts:all', [{ id: 'account-1' }]);

      // Execute
      await actualApi.deleteAccount('account-1');

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate accounts cache after closeAccount', async () => {
      // Setup
      vi.mocked(api.closeAccount).mockResolvedValue(undefined);
      cacheService.set('accounts:all', [{ id: 'account-1' }]);

      // Execute
      await actualApi.closeAccount('account-1');

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate accounts cache after reopenAccount', async () => {
      // Setup
      vi.mocked(api.reopenAccount).mockResolvedValue(undefined);
      cacheService.set('accounts:all', [{ id: 'account-1' }]);

      // Execute
      await actualApi.reopenAccount('account-1');

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('Category Operations', () => {
    it('should invalidate categories cache after createCategory', async () => {
      // Setup
      vi.mocked(api.createCategory).mockResolvedValue('new-category-id');
      cacheService.set('categories:all', [{ id: 'existing' }]);

      // Execute
      await actualApi.createCategory({ name: 'New Category' });

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate categories cache after updateCategory', async () => {
      // Setup
      vi.mocked(api.updateCategory).mockResolvedValue({} as any);
      cacheService.set('categories:all', [{ id: 'category-1' }]);

      // Execute
      await actualApi.updateCategory('category-1', { name: 'Updated' });

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate categories cache after deleteCategory', async () => {
      // Setup
      vi.mocked(api.deleteCategory).mockResolvedValue({
        error: undefined,
      } as any);
      cacheService.set('categories:all', [{ id: 'category-1' }]);

      // Execute
      await actualApi.deleteCategory('category-1');

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('Category Group Operations', () => {
    it('should invalidate categoryGroups cache after createCategoryGroup', async () => {
      // Setup
      vi.mocked(api.createCategoryGroup).mockResolvedValue('new-group-id');
      cacheService.set('categoryGroups:all', [{ id: 'existing' }]);

      // Execute
      await actualApi.createCategoryGroup({ name: 'New Group' });

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate categoryGroups cache after updateCategoryGroup', async () => {
      // Setup
      vi.mocked(api.updateCategoryGroup).mockResolvedValue(undefined);
      cacheService.set('categoryGroups:all', [{ id: 'group-1' }]);

      // Execute
      await actualApi.updateCategoryGroup('group-1', { name: 'Updated' });

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate categoryGroups cache after deleteCategoryGroup', async () => {
      // Setup
      vi.mocked(api.deleteCategoryGroup).mockResolvedValue(undefined);
      cacheService.set('categoryGroups:all', [{ id: 'group-1' }]);

      // Execute
      await actualApi.deleteCategoryGroup('group-1');

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('Payee Operations', () => {
    it('should invalidate payees cache after createPayee', async () => {
      // Setup
      vi.mocked(api.createPayee).mockResolvedValue('new-payee-id');
      cacheService.set('payees:all', [{ id: 'existing' }]);

      // Execute
      await actualApi.createPayee({ name: 'New Payee' });

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate payees cache after updatePayee', async () => {
      // Setup
      vi.mocked(api.updatePayee).mockResolvedValue(undefined);
      cacheService.set('payees:all', [{ id: 'payee-1' }]);

      // Execute
      await actualApi.updatePayee('payee-1', { name: 'Updated' });

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate payees cache after deletePayee', async () => {
      // Setup
      vi.mocked(api.deletePayee).mockResolvedValue(undefined);
      cacheService.set('payees:all', [{ id: 'payee-1' }]);

      // Execute
      await actualApi.deletePayee('payee-1');

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });

    it('should invalidate payees cache after mergePayees', async () => {
      // Setup
      vi.mocked(api.mergePayees).mockResolvedValue(undefined);
      cacheService.set('payees:all', [{ id: 'payee-1' }, { id: 'payee-2' }]);

      // Execute
      await actualApi.mergePayees('payee-1', ['payee-2']);

      // Verify cache was invalidated
      const stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
    });
  });
});
