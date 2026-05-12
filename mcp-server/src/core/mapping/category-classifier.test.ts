import { describe, it, expect } from 'vitest';
import { CategoryClassifier } from './category-classifier.js';
import type { Category } from '../types/domain.js';

describe('CategoryClassifier', () => {
  const classifier = new CategoryClassifier();

  it('should handle an empty array of categories', () => {
    const result = classifier.classify([]);
    expect(result.incomeCategories.size).toBe(0);
    expect(result.investmentSavingsCategories.size).toBe(0);
  });

  it('should correctly classify income categories', () => {
    const categories: Category[] = [
      { id: '1', name: 'Salary', group_id: 'g1', is_income: true },
      { id: '2', name: 'Bonus', group_id: 'g1', is_income: true },
      { id: '3', name: 'Rent', group_id: 'g2', is_income: false }, // Not income
    ];

    const result = classifier.classify(categories);
    expect(result.incomeCategories).toEqual(new Set(['1', '2']));
    expect(result.investmentSavingsCategories.size).toBe(0);
  });

  it('should correctly classify investment and savings categories case-insensitively', () => {
    const categories: Category[] = [
      { id: '1', name: 'My Investment Portfolio', group_id: 'g1', is_income: false },
      { id: '2', name: 'VACATION FUND', group_id: 'g1', is_income: false },
      { id: '3', name: 'Savings Account', group_id: 'g1', is_income: false },
      { id: '4', name: 'savings', group_id: 'g1', is_income: false },
      { id: '5', name: 'Groceries', group_id: 'g2', is_income: false }, // Not investment/savings
    ];

    const result = classifier.classify(categories);
    expect(result.incomeCategories.size).toBe(0);
    expect(result.investmentSavingsCategories).toEqual(new Set(['1', '2', '3', '4']));
  });

  it('should correctly classify categories that are both income and investment/savings', () => {
    const categories: Category[] = [
      { id: '1', name: 'Investment Returns', group_id: 'g1', is_income: true },
    ];

    const result = classifier.classify(categories);
    expect(result.incomeCategories).toEqual(new Set(['1']));
    expect(result.investmentSavingsCategories).toEqual(new Set(['1']));
  });

  it('should correctly ignore regular categories', () => {
    const categories: Category[] = [
      { id: '1', name: 'Groceries', group_id: 'g1', is_income: false },
      { id: '2', name: 'Utilities', group_id: 'g2', is_income: false },
    ];

    const result = classifier.classify(categories);
    expect(result.incomeCategories.size).toBe(0);
    expect(result.investmentSavingsCategories.size).toBe(0);
  });
});
