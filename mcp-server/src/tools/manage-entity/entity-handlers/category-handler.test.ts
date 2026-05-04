import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryHandler } from './category-handler.js';

const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();
const mockCacheInvalidate = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
  deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
}));

vi.mock('../../../core/cache/cache-service.js', () => ({
  cacheService: {
    invalidate: (...args: unknown[]) => mockCacheInvalidate(...args),
  },
}));

describe('CategoryHandler', () => {
  let handler: CategoryHandler;
  const validGroupId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new CategoryHandler();
    mockCreateCategory.mockResolvedValue('cat-new');
    mockUpdateCategory.mockResolvedValue(undefined);
    mockDeleteCategory.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('calls createCategory with name and group_id', async () => {
      const id = await handler.create({ name: 'Groceries', groupId: validGroupId });
      expect(mockCreateCategory).toHaveBeenCalledWith({
        name: 'Groceries',
        group_id: validGroupId,
      });
      expect(id).toBe('cat-new');
    });

    it('throws when data is invalid (empty name)', async () => {
      await expect(handler.create({ name: '', groupId: validGroupId })).rejects.toThrow();
    });

    it('throws when groupId is not a UUID', async () => {
      await expect(handler.create({ name: 'Groceries', groupId: 'not-a-uuid' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('calls updateCategory with id and mapped fields', async () => {
      await handler.update('cat-1', { name: 'Updated', groupId: validGroupId });
      expect(mockUpdateCategory).toHaveBeenCalledWith('cat-1', {
        name: 'Updated',
        group_id: validGroupId,
      });
    });

    it('throws when data is invalid', async () => {
      await expect(handler.update('cat-1', { name: '', groupId: validGroupId })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('calls deleteCategory with id', async () => {
      await handler.delete('cat-1');
      expect(mockDeleteCategory).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('validate', () => {
    it('does not throw for valid create operation (no id required)', () => {
      expect(() =>
        handler.validate('create', undefined, { name: 'X', groupId: validGroupId }),
      ).not.toThrow();
    });

    it('throws MCPResponse when id is missing for update', () => {
      expect(() =>
        handler.validate('update', undefined, { name: 'X', groupId: validGroupId }),
      ).toThrow();
    });

    it('throws MCPResponse when data is missing for create', () => {
      expect(() => handler.validate('create', undefined, undefined)).toThrow();
    });

    it('does not throw when id and data are present for update', () => {
      expect(() =>
        handler.validate('update', 'cat-1', { name: 'X', groupId: validGroupId }),
      ).not.toThrow();
    });

    it('does not throw when only id is provided for delete', () => {
      expect(() => handler.validate('delete', 'cat-1', undefined)).not.toThrow();
    });
  });

  describe('invalidateCache', () => {
    it('invalidates categories:all and categoryGroups:all', () => {
      handler.invalidateCache();
      expect(mockCacheInvalidate).toHaveBeenCalledWith('categories:all');
      expect(mockCacheInvalidate).toHaveBeenCalledWith('categoryGroups:all');
    });
  });
});
