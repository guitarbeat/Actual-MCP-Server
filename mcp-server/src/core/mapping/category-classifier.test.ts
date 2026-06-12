import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryClassifier } from './category-classifier.js';
import type { Category } from '../types/domain.js';

describe('CategoryClassifier', () => {
  let classifier: CategoryClassifier;

  beforeEach(() => {
    classifier = new CategoryClassifier();
  });

  it('should handle an empty input array', () => {
    const result = classifier.classify([]);
    expect(result.incomeCategories.size).toBe(0);
    expect(result.investmentSavingsCategories.size).toBe(0);
  });

  it('should identify income categories based on is_income flag', () => {
    const categories: Category[] = [
      { id: '1', name: 'Salary', group_id: 'g1', is_income: true },
      { id: '2', name: 'Groceries', group_id: 'g2', is_income: false },
      { id: '3', name: 'Bonus', group_id: 'g1', is_income: true },
    ];

    const result = classifier.classify(categories);
    expect(result.incomeCategories).toEqual(new Set(['1', '3']));
    expect(result.investmentSavingsCategories.size).toBe(0);
  });

  it('should identify investment and savings categories based on keywords', () => {
    const categories: Category[] = [
      { id: '1', name: 'Investment Account', group_id: 'g1' },
      { id: '2', name: 'Vacation Fund', group_id: 'g1' },
      { id: '3', name: 'Emergency Savings', group_id: 'g1' },
      { id: '4', name: 'Regular Expenses', group_id: 'g1' },
    ];

    const result = classifier.classify(categories);
    expect(result.investmentSavingsCategories).toEqual(new Set(['1', '2', '3']));
    expect(result.incomeCategories.size).toBe(0);
  });

  it('should handle keyword matches in different cases', () => {
    const categories: Category[] = [
      { id: '1', name: 'INVESTMENT', group_id: 'g1' },
      { id: '2', name: 'vacation', group_id: 'g1' },
      { id: '3', name: 'SaViNgS', group_id: 'g1' },
    ];

    const result = classifier.classify(categories);
    expect(result.investmentSavingsCategories).toEqual(new Set(['1', '2', '3']));
  });

  it('should correctly classify mixed categories', () => {
    const categories: Category[] = [
      { id: '1', name: 'Salary', group_id: 'g1', is_income: true },
      { id: '2', name: 'Vacation Fund', group_id: 'g2' },
      { id: '3', name: 'Groceries', group_id: 'g3' }, // Matches neither
      { id: '4', name: 'Dividend Income', group_id: 'g1', is_income: true },
      { id: '5', name: 'Investment Returns', group_id: 'g2', is_income: true }, // Matches both
    ];

    const result = classifier.classify(categories);
    expect(result.incomeCategories).toEqual(new Set(['1', '4', '5']));
    expect(result.investmentSavingsCategories).toEqual(new Set(['2', '5']));
  });
});
