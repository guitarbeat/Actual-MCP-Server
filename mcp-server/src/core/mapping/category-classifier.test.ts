import { describe, expect, it } from 'vitest';
import { CategoryClassifier } from './category-classifier.js';
import type { Category } from '../types/domain.js';

function makeCategory(overrides: Partial<Category> & { id: string; name: string }): Category {
  return {
    group_id: 'group-1',
    is_income: false,
    ...overrides,
  };
}

describe('CategoryClassifier', () => {
  const classifier = new CategoryClassifier();

  it('classifies income categories by is_income flag', () => {
    const categories: Category[] = [
      makeCategory({ id: 'cat-1', name: 'Salary', is_income: true }),
      makeCategory({ id: 'cat-2', name: 'Groceries', is_income: false }),
    ];

    const { incomeCategories, investmentSavingsCategories } = classifier.classify(categories);

    expect(incomeCategories.has('cat-1')).toBe(true);
    expect(incomeCategories.has('cat-2')).toBe(false);
    expect(investmentSavingsCategories.size).toBe(0);
  });

  it('classifies savings categories by name keyword', () => {
    const categories: Category[] = [
      makeCategory({ id: 'cat-1', name: 'Emergency Savings' }),
      makeCategory({ id: 'cat-2', name: 'Groceries' }),
    ];

    const { incomeCategories, investmentSavingsCategories } = classifier.classify(categories);

    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
    expect(investmentSavingsCategories.has('cat-2')).toBe(false);
    expect(incomeCategories.size).toBe(0);
  });

  it('classifies investment categories by name keyword', () => {
    const categories: Category[] = [
      makeCategory({ id: 'cat-1', name: '401k Investment' }),
      makeCategory({ id: 'cat-2', name: 'Rent' }),
    ];

    const { investmentSavingsCategories } = classifier.classify(categories);

    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
    expect(investmentSavingsCategories.has('cat-2')).toBe(false);
  });

  it('classifies vacation categories by name keyword', () => {
    const categories: Category[] = [makeCategory({ id: 'cat-1', name: 'Vacation Fund' })];

    const { investmentSavingsCategories } = classifier.classify(categories);

    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
  });

  it('classifies keyword matching case-insensitively', () => {
    const categories: Category[] = [
      makeCategory({ id: 'cat-1', name: 'INVESTMENT ACCOUNT' }),
      makeCategory({ id: 'cat-2', name: 'VACATION' }),
      makeCategory({ id: 'cat-3', name: 'SAVINGS ACCOUNT' }),
    ];

    const { investmentSavingsCategories } = classifier.classify(categories);

    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
    expect(investmentSavingsCategories.has('cat-2')).toBe(true);
    expect(investmentSavingsCategories.has('cat-3')).toBe(true);
  });

  it('handles empty category list', () => {
    const { incomeCategories, investmentSavingsCategories } = classifier.classify([]);

    expect(incomeCategories.size).toBe(0);
    expect(investmentSavingsCategories.size).toBe(0);
  });

  it('can mark a category as both income and investment/savings', () => {
    const categories: Category[] = [
      makeCategory({ id: 'cat-1', name: 'Dividend Savings', is_income: true }),
    ];

    const { incomeCategories, investmentSavingsCategories } = classifier.classify(categories);

    expect(incomeCategories.has('cat-1')).toBe(true);
    expect(investmentSavingsCategories.has('cat-1')).toBe(true);
  });
});
