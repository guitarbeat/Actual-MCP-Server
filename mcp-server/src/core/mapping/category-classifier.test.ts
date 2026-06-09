import { describe, expect, it } from 'vitest';
import { CategoryClassifier } from './category-classifier.js';
import type { Category } from '../types/domain.js';

describe('CategoryClassifier.classify()', () => {
  const classifier = new CategoryClassifier();

  it('returns empty sets for an empty categories array', () => {
    const result = classifier.classify([]);
    expect(result.incomeCategories.size).toBe(0);
    expect(result.investmentSavingsCategories.size).toBe(0);
  });

  it('adds categories with is_income=true to incomeCategories', () => {
    const categories: Category[] = [
      { id: 'cat-1', name: 'Salary', group_id: 'grp-1', is_income: true },
      { id: 'cat-2', name: 'Groceries', group_id: 'grp-1', is_income: false },
    ];
    const { incomeCategories, investmentSavingsCategories } = classifier.classify(categories);
    expect(incomeCategories.has('cat-1')).toBe(true);
    expect(incomeCategories.has('cat-2')).toBe(false);
    expect(investmentSavingsCategories.size).toBe(0);
  });

  it('adds categories with "investment" in name to investmentSavingsCategories', () => {
    const categories: Category[] = [{ id: 'cat-1', name: 'Stock Investment', group_id: 'grp-1' }];
    const { investmentSavingsCategories, incomeCategories } = classifier.classify(categories);
    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
    expect(incomeCategories.size).toBe(0);
  });

  it('adds categories with "vacation" in name to investmentSavingsCategories', () => {
    const categories: Category[] = [{ id: 'cat-1', name: 'Vacation Fund', group_id: 'grp-1' }];
    const { investmentSavingsCategories } = classifier.classify(categories);
    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
  });

  it('adds categories with "savings" in name to investmentSavingsCategories', () => {
    const categories: Category[] = [{ id: 'cat-1', name: 'Emergency Savings', group_id: 'grp-1' }];
    const { investmentSavingsCategories } = classifier.classify(categories);
    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
  });

  it('matches investmentSavingsCategories case-insensitively', () => {
    const categories: Category[] = [
      { id: 'cat-1', name: 'INVESTMENT ACCOUNT', group_id: 'grp-1' },
      { id: 'cat-2', name: 'My SAVINGS', group_id: 'grp-1' },
      { id: 'cat-3', name: 'VACATION', group_id: 'grp-1' },
    ];
    const { investmentSavingsCategories } = classifier.classify(categories);
    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
    expect(investmentSavingsCategories.has('cat-2')).toBe(true);
    expect(investmentSavingsCategories.has('cat-3')).toBe(true);
  });

  it('can add a category to both incomeCategories and investmentSavingsCategories', () => {
    const categories: Category[] = [
      { id: 'cat-1', name: 'Investment Income', group_id: 'grp-1', is_income: true },
    ];
    const { incomeCategories, investmentSavingsCategories } = classifier.classify(categories);
    expect(incomeCategories.has('cat-1')).toBe(true);
    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
  });

  it('does not add regular expense categories to either set', () => {
    const categories: Category[] = [
      { id: 'cat-1', name: 'Groceries', group_id: 'grp-1', is_income: false },
      { id: 'cat-2', name: 'Dining Out', group_id: 'grp-1' },
    ];
    const { incomeCategories, investmentSavingsCategories } = classifier.classify(categories);
    expect(incomeCategories.size).toBe(0);
    expect(investmentSavingsCategories.size).toBe(0);
  });
});
