import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryGroupHandler } from './category-group-handler.js';

const mockCreateCategoryGroup = vi.fn();
const mockUpdateCategoryGroup = vi.fn();
const mockDeleteCategoryGroup = vi.fn();
const mockCacheInvalidate = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  createCategoryGroup: (...args: unknown[]) => mockCreateCategoryGroup(...args),
  updateCategoryGroup: (...args: unknown[]) => mockUpdateCategoryGroup(...args),
  deleteCategoryGroup: (...args: unknown[]) => mockDeleteCategoryGroup(...args),
}));

vi.mock('../../../core/cache/cache-service.js', () => ({
  cacheService: {
    invalidate: (...args: unknown[]) => mockCacheInvalidate(...args),
  },
}));

describe('CategoryGroupHandler', () => {
  let handler: CategoryGroupHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new CategoryGroupHandler();
    mockCreateCategoryGroup.mockResolvedValue('grp-new');
    mockUpdateCategoryGroup.mockResolvedValue(undefined);
    mockDeleteCategoryGroup.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('calls createCategoryGroup with validated name', async () => {
      const id = await handler.create({ name: 'Housing' });
      expect(mockCreateCategoryGroup).toHaveBeenCalledWith({ name: 'Housing' });
      expect(id).toBe('grp-new');
    });

    it('throws when name is empty', async () => {
      await expect(handler.create({ name: '' })).rejects.toThrow();
    });

    it('throws when name exceeds 100 characters', async () => {
      await expect(handler.create({ name: 'a'.repeat(101) })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('calls updateCategoryGroup with id and validated data', async () => {
      await handler.update('grp-1', { name: 'Updated Housing' });
      expect(mockUpdateCategoryGroup).toHaveBeenCalledWith('grp-1', { name: 'Updated Housing' });
    });

    it('throws when name is empty', async () => {
      await expect(handler.update('grp-1', { name: '' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('calls deleteCategoryGroup with id', async () => {
      await handler.delete('grp-1');
      expect(mockDeleteCategoryGroup).toHaveBeenCalledWith('grp-1');
    });
  });

  describe('validate', () => {
    it('does not throw for create with data', () => {
      expect(() => handler.validate('create', undefined, { name: 'X' })).not.toThrow();
    });

    it('throws when id is missing for update', () => {
      expect(() => handler.validate('update', undefined, { name: 'X' })).toThrow();
    });

    it('throws when data is missing for create', () => {
      expect(() => handler.validate('create', undefined, undefined)).toThrow();
    });

    it('does not throw for delete with id and no data', () => {
      expect(() => handler.validate('delete', 'grp-1', undefined)).not.toThrow();
    });
  });

  describe('invalidateCache', () => {
    it('invalidates categoryGroups:all and categories:all', () => {
      handler.invalidateCache();
      expect(mockCacheInvalidate).toHaveBeenCalledWith('categoryGroups:all');
      expect(mockCacheInvalidate).toHaveBeenCalledWith('categories:all');
    });
  });
});
