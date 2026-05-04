import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TagHandler } from './tag-handler.js';

const mockCreateTag = vi.fn();
const mockUpdateTag = vi.fn();
const mockDeleteTag = vi.fn();
const mockCacheInvalidate = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  createTag: (...args: unknown[]) => mockCreateTag(...args),
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
  deleteTag: (...args: unknown[]) => mockDeleteTag(...args),
}));

vi.mock('../../../core/cache/cache-service.js', () => ({
  cacheService: {
    invalidate: (...args: unknown[]) => mockCacheInvalidate(...args),
  },
}));

describe('TagHandler', () => {
  let handler: TagHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new TagHandler();
    mockCreateTag.mockResolvedValue('tag-new');
    mockUpdateTag.mockResolvedValue(undefined);
    mockDeleteTag.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('calls createTag with validated data and returns id', async () => {
      const id = await handler.create({ tag: 'vacation' });
      expect(mockCreateTag).toHaveBeenCalledWith({ tag: 'vacation' });
      expect(id).toBe('tag-new');
    });

    it('includes optional color and description', async () => {
      await handler.create({ tag: 'food', color: '#ff0000', description: 'Food expenses' });
      expect(mockCreateTag).toHaveBeenCalledWith({
        tag: 'food',
        color: '#ff0000',
        description: 'Food expenses',
      });
    });

    it('throws when tag label is empty', async () => {
      await expect(handler.create({ tag: '' })).rejects.toThrow();
    });

    it('throws when tag label exceeds 100 characters', async () => {
      await expect(handler.create({ tag: 'a'.repeat(101) })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('calls updateTag with id and partial validated data', async () => {
      await handler.update('tag-1', { tag: 'updated-tag' });
      expect(mockUpdateTag).toHaveBeenCalledWith('tag-1', { tag: 'updated-tag' });
    });

    it('supports empty partial update', async () => {
      await handler.update('tag-1', {});
      expect(mockUpdateTag).toHaveBeenCalledWith('tag-1', {});
    });

    it('accepts null color to clear color', async () => {
      await handler.update('tag-1', { color: null });
      expect(mockUpdateTag).toHaveBeenCalledWith('tag-1', { color: null });
    });
  });

  describe('delete', () => {
    it('calls deleteTag with id', async () => {
      await handler.delete('tag-1');
      expect(mockDeleteTag).toHaveBeenCalledWith('tag-1');
    });
  });

  describe('validate', () => {
    it('does not throw for create with data', () => {
      expect(() => handler.validate('create', undefined, { tag: 'x' })).not.toThrow();
    });

    it('throws when id is missing for update', () => {
      expect(() => handler.validate('update', undefined, { tag: 'x' })).toThrow();
    });

    it('throws when data is missing for create', () => {
      expect(() => handler.validate('create', undefined, undefined)).toThrow();
    });

    it('does not throw for delete with id', () => {
      expect(() => handler.validate('delete', 'tag-1', undefined)).not.toThrow();
    });
  });

  describe('invalidateCache', () => {
    it('invalidates tags:all', () => {
      handler.invalidateCache();
      expect(mockCacheInvalidate).toHaveBeenCalledWith('tags:all');
    });
  });
});
