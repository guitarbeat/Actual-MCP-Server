import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryClassifier } from './category-classifier.js';
import type { Category } from '../types/domain.js';

describe('CategoryClassifier', () => {
  let classifier: CategoryClassifier;

  beforeEach(() => {
    classifier = new CategoryClassifier();
  });

  it('handles empty input', () => {
    const result = classifier.classify([]);
    expect(result.incomeCategories.size).toBe(0);
    expect(result.investmentSavingsCategories.size).toBe(0);
  });

  it('classifies income categories correctly based on is_income flag', () => {
    const categories: Category[] = [
      { id: '1', name: 'Salary', group_id: 'g1', is_income: true },
      { id: '2', name: 'Bonus', group_id: 'g1', is_income: true },
      { id: '3', name: 'Groceries', group_id: 'g2', is_income: false },
    ];

    const result = classifier.classify(categories);
    expect(result.incomeCategories).toEqual(new Set(['1', '2']));
    expect(result.investmentSavingsCategories.size).toBe(0);
  });

  it('classifies investment, savings, and vacation categories by name case-insensitively', () => {
    const categories: Category[] = [
      { id: '1', name: 'Investment Account', group_id: 'g1' },
      { id: '2', name: 'Emergency SAVINGS', group_id: 'g1' },
      { id: '3', name: 'Summer VaCaTiOn', group_id: 'g1' },
      { id: '4', name: 'Rent', group_id: 'g1' },
    ];

    const result = classifier.classify(categories);
    expect(result.incomeCategories.size).toBe(0);
    expect(result.investmentSavingsCategories).toEqual(new Set(['1', '2', '3']));
  });

  it('handles categories that match both income and investment/savings', () => {
    const categories: Category[] = [
      { id: '1', name: 'Investment Income', group_id: 'g1', is_income: true },
    ];

    const result = classifier.classify(categories);
    expect(result.incomeCategories).toEqual(new Set(['1']));
    expect(result.investmentSavingsCategories).toEqual(new Set(['1']));
  });
});
