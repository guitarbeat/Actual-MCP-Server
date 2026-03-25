import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryMapper } from './category-mapper.js';
import type { Category, CategoryGroup } from '../types/domain.js';

describe('CategoryMapper', () => {
  const mockGroups: CategoryGroup[] = [
    { id: 'g1', name: 'Everyday Expenses' },
    { id: 'g2', name: 'Income', is_income: true },
    { id: 'g3', name: 'Savings Goals' },
    { id: 'g4', name: 'Long-term Investments' },
  ];

  const mockCategories: Category[] = [
    { id: 'c1', name: 'Groceries', group_id: 'g1' },
    { id: 'c2', name: 'Salary', group_id: 'g2', is_income: true },
    { id: 'c3', name: 'Emergency Fund', group_id: 'g3' },
    { id: 'c4', name: '401k', group_id: 'g4' },
    { id: 'c5', name: 'Unknown Group Category', group_id: 'nonexistent_group' },
  ];

  let mapper: CategoryMapper;

  beforeEach(() => {
    mapper = new CategoryMapper(mockCategories, mockGroups);
  });

  describe('constructor', () => {
    it('initializes with empty arrays', () => {
      const emptyMapper = new CategoryMapper([], []);
      expect(emptyMapper.getCategoryName('c1')).toBe('Unknown Category');
      expect(emptyMapper.getGroupInfo('c1')).toBeUndefined();
    });

    it('identifies savings and investment categories based on group name', () => {
      // Emergency Fund is in "Savings Goals"
      expect(mapper.isInvestmentCategory('c3')).toBe(true);
      // 401k is in "Long-term Investments"
      expect(mapper.isInvestmentCategory('c4')).toBe(true);

      // Groceries and Salary are not
      expect(mapper.isInvestmentCategory('c1')).toBe(false);
      expect(mapper.isInvestmentCategory('c2')).toBe(false);
    });
  });

  describe('getCategoryName', () => {
    it('returns the category name for a known category id', () => {
      expect(mapper.getCategoryName('c1')).toBe('Groceries');
      expect(mapper.getCategoryName('c2')).toBe('Salary');
    });

    it('returns "Unknown Category" for an unknown category id', () => {
      expect(mapper.getCategoryName('nonexistent')).toBe('Unknown Category');
    });
  });

  describe('getGroupInfo', () => {
    it('returns complete group info for a known category', () => {
      const info = mapper.getGroupInfo('c1');
      expect(info).toEqual({
        id: 'g1',
        name: 'Everyday Expenses',
        isIncome: false,
        isSavingsOrInvestment: false,
      });
    });

    it('correctly sets isIncome flag based on category', () => {
      const info = mapper.getGroupInfo('c2');
      expect(info).toEqual({
        id: 'g2',
        name: 'Income',
        isIncome: true,
        isSavingsOrInvestment: false,
      });
    });

    it('returns info with "Unknown Group" when category group_id does not exist', () => {
      const info = mapper.getGroupInfo('c5');
      expect(info).toEqual({
        id: 'nonexistent_group',
        name: 'Unknown Group',
        isIncome: false,
        isSavingsOrInvestment: false,
      });
    });

    it('returns undefined for an unknown category id', () => {
      expect(mapper.getGroupInfo('nonexistent')).toBeUndefined();
    });
  });

  describe('isInvestmentCategory', () => {
    it('returns true for categories in investment or savings groups', () => {
      expect(mapper.isInvestmentCategory('c3')).toBe(true);
      expect(mapper.isInvestmentCategory('c4')).toBe(true);
    });

    it('returns false for other categories', () => {
      expect(mapper.isInvestmentCategory('c1')).toBe(false);
      expect(mapper.isInvestmentCategory('c5')).toBe(false);
    });

    it('returns false for unknown categories', () => {
      expect(mapper.isInvestmentCategory('nonexistent')).toBe(false);
    });
  });
});
