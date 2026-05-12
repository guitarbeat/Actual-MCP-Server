import { describe, it, expect } from 'vitest';
import { CategoryClassifier } from './category-classifier.js';
import type { Category } from '../types/domain.js';

describe('CategoryClassifier', () => {
  const classifier = new CategoryClassifier();

  const createCategory = (overrides: Partial<Category>): Category => ({
    id: 'default-id',
    name: 'Default',
    group_id: 'default-group',
    ...overrides,
  });

  it('should handle an empty array', () => {
    const result = classifier.classify([]);
    expect(result.incomeCategories.size).toBe(0);
    expect(result.investmentSavingsCategories.size).toBe(0);
  });

  it('should identify income categories based on is_income flag', () => {
    const categories: Category[] = [
      createCategory({ id: 'cat1', name: 'Salary', is_income: true }),
      createCategory({ id: 'cat2', name: 'Groceries', is_income: false }),
    ];
    const result = classifier.classify(categories);
    expect(result.incomeCategories.has('cat1')).toBe(true);
    expect(result.incomeCategories.has('cat2')).toBe(false);
    expect(result.incomeCategories.size).toBe(1);
    expect(result.investmentSavingsCategories.size).toBe(0);
  });

  it('should identify investment and savings categories based on name keywords', () => {
    const categories: Category[] = [
      createCategory({ id: 'cat1', name: 'My Investment Fund' }),
      createCategory({ id: 'cat2', name: 'Savings Account' }),
      createCategory({ id: 'cat3', name: 'Vacation Fund' }),
      createCategory({ id: 'cat4', name: 'Groceries' }),
    ];
    const result = classifier.classify(categories);
    expect(result.investmentSavingsCategories.has('cat1')).toBe(true);
    expect(result.investmentSavingsCategories.has('cat2')).toBe(true);
    expect(result.investmentSavingsCategories.has('cat3')).toBe(true);
    expect(result.investmentSavingsCategories.has('cat4')).toBe(false);
    expect(result.investmentSavingsCategories.size).toBe(3);
    expect(result.incomeCategories.size).toBe(0);
  });

  it('should handle case-insensitivity for name matching', () => {
    const categories: Category[] = [
      createCategory({ id: 'cat1', name: 'InVeStMeNt' }),
      createCategory({ id: 'cat2', name: 'sAvInGs' }),
      createCategory({ id: 'cat3', name: 'VaCaTiOn' }),
    ];
    const result = classifier.classify(categories);
    expect(result.investmentSavingsCategories.has('cat1')).toBe(true);
    expect(result.investmentSavingsCategories.has('cat2')).toBe(true);
    expect(result.investmentSavingsCategories.has('cat3')).toBe(true);
    expect(result.investmentSavingsCategories.size).toBe(3);
  });

  it('should handle categories that are both income and savings/investment', () => {
    const categories: Category[] = [
      createCategory({ id: 'cat1', name: 'Interest Savings', is_income: true }),
    ];
    const result = classifier.classify(categories);
    expect(result.incomeCategories.has('cat1')).toBe(true);
    expect(result.investmentSavingsCategories.has('cat1')).toBe(true);
    expect(result.incomeCategories.size).toBe(1);
    expect(result.investmentSavingsCategories.size).toBe(1);
  });

  it('should ignore categories that do not match any criteria', () => {
    const categories: Category[] = [
      createCategory({ id: 'cat1', name: 'Rent' }),
      createCategory({ id: 'cat2', name: 'Utilities' }),
      createCategory({ id: 'cat3', name: 'Dining Out' }),
    ];
    const result = classifier.classify(categories);
    expect(result.incomeCategories.size).toBe(0);
    expect(result.investmentSavingsCategories.size).toBe(0);
  });
});
