import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryClassifier } from './category-classifier.js';
import type { Category } from '../types/domain.js';

describe('CategoryClassifier', () => {
  let classifier: CategoryClassifier;

  beforeEach(() => {
    classifier = new CategoryClassifier();
  });

  describe('classify', () => {
    it('returns empty sets when given an empty array', () => {
      const result = classifier.classify([]);
      expect(result.incomeCategories.size).toBe(0);
      expect(result.investmentSavingsCategories.size).toBe(0);
    });

    it('identifies income categories based on is_income property', () => {
      const categories: Category[] = [
        { id: '1', name: 'Salary', group_id: 'g1', is_income: true },
        { id: '2', name: 'Groceries', group_id: 'g2', is_income: false },
        { id: '3', name: 'Bonus', group_id: 'g1', is_income: true },
      ];

      const result = classifier.classify(categories);

      expect(result.incomeCategories.size).toBe(2);
      expect(result.incomeCategories.has('1')).toBe(true);
      expect(result.incomeCategories.has('3')).toBe(true);
      expect(result.incomeCategories.has('2')).toBe(false);

      expect(result.investmentSavingsCategories.size).toBe(0);
    });

    it('identifies investment/savings categories based on keywords in name', () => {
      const categories: Category[] = [
        { id: '1', name: 'Groceries', group_id: 'g1' },
        { id: '2', name: 'Investment Account', group_id: 'g2' },
        { id: '3', name: 'Vacation Fund', group_id: 'g2' },
        { id: '4', name: 'Emergency Savings', group_id: 'g2' },
        { id: '5', name: 'savings for car', group_id: 'g2' },
        { id: '6', name: 'INVESTMENT PORTFOLIO', group_id: 'g2' },
      ];

      const result = classifier.classify(categories);

      expect(result.incomeCategories.size).toBe(0);

      expect(result.investmentSavingsCategories.size).toBe(5);
      expect(result.investmentSavingsCategories.has('1')).toBe(false);
      expect(result.investmentSavingsCategories.has('2')).toBe(true);
      expect(result.investmentSavingsCategories.has('3')).toBe(true);
      expect(result.investmentSavingsCategories.has('4')).toBe(true);
      expect(result.investmentSavingsCategories.has('5')).toBe(true); // Case-insensitive
      expect(result.investmentSavingsCategories.has('6')).toBe(true); // Case-insensitive
    });

    it('handles categories that are both income and investment/savings', () => {
      const categories: Category[] = [
        { id: '1', name: 'Investment Dividends', group_id: 'g1', is_income: true },
      ];

      const result = classifier.classify(categories);

      expect(result.incomeCategories.size).toBe(1);
      expect(result.incomeCategories.has('1')).toBe(true);

      expect(result.investmentSavingsCategories.size).toBe(1);
      expect(result.investmentSavingsCategories.has('1')).toBe(true);
    });
  });
});
