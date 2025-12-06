import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoryHandler } from './category-handler.js';
import * as actualApi from '../../../actual-api.js';
import { randomUUID } from 'crypto';

vi.mock('../../../actual-api.js');

describe('CategoryHandler', () => {
  let categoryHandler: CategoryHandler;
  let groupId: string;

  beforeEach(() => {
    categoryHandler = new CategoryHandler();
    vi.clearAllMocks();
    groupId = randomUUID();
  });

  describe('create', () => {
    it('should create a category with valid data', async () => {
      const data = { name: 'Groceries', groupId };
      const expectedId = 'new-category-id';
      vi.mocked(actualApi.createCategory).mockResolvedValue(expectedId);

      const result = await categoryHandler.create(data);

      expect(actualApi.createCategory).toHaveBeenCalledWith({ name: 'Groceries', group_id: groupId });
      expect(result).toBe(expectedId);
    });
  });

  describe('update', () => {
    it('should update a category with valid data', async () => {
      const id = 'category-1';
      const data = { name: 'Groceries', groupId };
      vi.mocked(actualApi.updateCategory).mockResolvedValue(undefined);

      await categoryHandler.update(id, data);

      expect(actualApi.updateCategory).toHaveBeenCalledWith(id, { name: 'Groceries', group_id: groupId });
    });
  });

  describe('delete', () => {
    it('should delete a category by id', async () => {
      const id = 'category-1';
      vi.mocked(actualApi.deleteCategory).mockResolvedValue({});

      await categoryHandler.delete(id);

      expect(actualApi.deleteCategory).toHaveBeenCalledWith(id);
    });
  });

  describe('validate', () => {
    it('should throw an error if id is missing for update', () => {
      expect(() => categoryHandler.validate('update', undefined, {})).toThrow();
    });

    it('should throw an error if id is missing for delete', () => {
      expect(() => categoryHandler.validate('delete', undefined)).toThrow();
    });

    it('should throw an error if data is missing for create', () => {
      expect(() => categoryHandler.validate('create')).toThrow();
    });

    it('should throw an error if data is missing for update', () => {
      expect(() => categoryHandler.validate('update', 'some-id', undefined)).toThrow();
    });
  });
});
