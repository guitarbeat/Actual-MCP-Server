import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as actualApi from '../../../actual-api.js';
import { CategoryGroupHandler } from './category-group-handler.js';

vi.mock('../../../actual-api.js');

describe('CategoryGroupHandler', () => {
  let categoryGroupHandler: CategoryGroupHandler;

  beforeEach(() => {
    categoryGroupHandler = new CategoryGroupHandler();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category group with valid data', async () => {
      const data = { name: 'Groceries' };
      const expectedId = 'new-category-group-id';
      vi.mocked(actualApi.createCategoryGroup).mockResolvedValue(expectedId);

      const result = await categoryGroupHandler.create(data);

      expect(actualApi.createCategoryGroup).toHaveBeenCalledWith(data);
      expect(result).toBe(expectedId);
    });
  });

  describe('update', () => {
    it('should update a category group with valid data', async () => {
      const id = 'category-group-1';
      const data = { name: 'Groceries' };
      vi.mocked(actualApi.updateCategoryGroup).mockResolvedValue(undefined);

      await categoryGroupHandler.update(id, data);

      expect(actualApi.updateCategoryGroup).toHaveBeenCalledWith(id, data);
    });
  });

  describe('delete', () => {
    it('should delete a category group by id', async () => {
      const id = 'category-group-1';
      vi.mocked(actualApi.deleteCategoryGroup).mockResolvedValue(undefined);

      await categoryGroupHandler.delete(id);

      expect(actualApi.deleteCategoryGroup).toHaveBeenCalledWith(id);
    });
  });

  describe('validate', () => {
    it('should throw an error if id is missing for update', () => {
      expect(() => categoryGroupHandler.validate('update', undefined, {})).toThrow();
    });

    it('should throw an error if id is missing for delete', () => {
      expect(() => categoryGroupHandler.validate('delete', undefined)).toThrow();
    });

    it('should throw an error if data is missing for create', () => {
      expect(() => categoryGroupHandler.validate('create')).toThrow();
    });

    it('should throw an error if data is missing for update', () => {
      expect(() => categoryGroupHandler.validate('update', 'some-id', undefined)).toThrow();
    });
  });
});
