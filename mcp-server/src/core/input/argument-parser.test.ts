import { describe, expect, it } from 'vitest';
import { parseCategoryFilter } from './argument-parser.js';

describe('argument-parser', () => {
  describe('parseCategoryFilter', () => {
    it('returns an empty object if no arguments are provided', () => {
      expect(parseCategoryFilter()).toEqual({});
    });

    it('throws an error if both categoryId and categoryName are provided', () => {
      expect(() => parseCategoryFilter('id-123', 'Food')).toThrow(
        'Cannot specify both categoryId and categoryName',
      );
    });

    it('returns a CategoryFilter with categoryId if only categoryId is provided', () => {
      expect(parseCategoryFilter('id-123')).toEqual({ categoryId: 'id-123' });
    });

    it('returns a CategoryFilter with categoryName if only categoryName is provided', () => {
      expect(parseCategoryFilter(undefined, 'Food')).toEqual({ categoryName: 'Food' });
    });

    it('throws an error if categoryId is an empty string', () => {
      expect(() => parseCategoryFilter('   ')).toThrow('categoryId must be a non-empty string');
    });

    it('throws an error if categoryName is an empty string', () => {
      expect(() => parseCategoryFilter(undefined, '   ')).toThrow(
        'categoryName must be a non-empty string',
      );
    });

    it('throws an error if categoryId is not a string', () => {
      // @ts-expect-error - testing invalid input
      expect(() => parseCategoryFilter(123)).toThrow('categoryId must be a non-empty string');
    });

    it('throws an error if categoryName is not a string', () => {
      // @ts-expect-error - testing invalid input
      expect(() => parseCategoryFilter(undefined, 123)).toThrow(
        'categoryName must be a non-empty string',
      );
    });
  });
});
