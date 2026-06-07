import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryClassifier } from './category-classifier.js';
import type { Category } from '../types/domain.js';

describe('CategoryClassifier', () => {
  let classifier: CategoryClassifier;

  beforeEach(() => {
    classifier = new CategoryClassifier();
  });

  describe('classify', () => {
    it('handles empty input', () => {
      const result = classifier.classify([]);
      expect(result.incomeCategories.size).toBe(0);
      expect(result.investmentSavingsCategories.size).toBe(0);
    });

    it('identifies income categories based on is_income flag', () => {
      const categories: Category[] = [
        { id: 'c1', name: 'Salary', group_id: 'g1', is_income: true },
        { id: 'c2', name: 'Bonus', group_id: 'g1', is_income: true },
        { id: 'c3', name: 'Groceries', group_id: 'g2', is_income: false },
        { id: 'c4', name: 'Rent', group_id: 'g2' }, // implicitly false/undefined
      ];

      const result = classifier.classify(categories);

      expect(result.incomeCategories).toContain('c1');
      expect(result.incomeCategories).toContain('c2');
      expect(result.incomeCategories).not.toContain('c3');
      expect(result.incomeCategories).not.toContain('c4');
      expect(result.incomeCategories.size).toBe(2);
    });

    it('identifies investment/savings categories based on keywords in name', () => {
      const categories: Category[] = [
        { id: 'c1', name: 'Long term investment', group_id: 'g1' },
        { id: 'c2', name: 'Emergency SAVINGS', group_id: 'g1' }, // Case insensitivity check
        { id: 'c3', name: 'Summer VaCaTiOn', group_id: 'g1' }, // Case insensitivity check
        { id: 'c4', name: 'Groceries', group_id: 'g2' },
      ];

      const result = classifier.classify(categories);

      expect(result.investmentSavingsCategories).toContain('c1');
      expect(result.investmentSavingsCategories).toContain('c2');
      expect(result.investmentSavingsCategories).toContain('c3');
      expect(result.investmentSavingsCategories).not.toContain('c4');
      expect(result.investmentSavingsCategories.size).toBe(3);
    });

    it('handles categories that are both income and investment/savings', () => {
      const categories: Category[] = [
        { id: 'c1', name: 'Investment Returns', group_id: 'g1', is_income: true },
      ];

      const result = classifier.classify(categories);

      expect(result.incomeCategories).toContain('c1');
      expect(result.investmentSavingsCategories).toContain('c1');
      expect(result.incomeCategories.size).toBe(1);
      expect(result.investmentSavingsCategories.size).toBe(1);
    });

    it('handles categories that are neither', () => {
      const categories: Category[] = [
        { id: 'c1', name: 'Groceries', group_id: 'g1', is_income: false },
        { id: 'c2', name: 'Rent', group_id: 'g1' },
      ];

      const result = classifier.classify(categories);

      expect(result.incomeCategories.size).toBe(0);
      expect(result.investmentSavingsCategories.size).toBe(0);
    });
  });
});
