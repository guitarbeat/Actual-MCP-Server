import { describe, expect, it } from 'vitest';
import { CategoryClassifier } from './category-classifier.js';

describe('CategoryClassifier', () => {
  const classifier = new CategoryClassifier();

  const makeCategory = (id: string, name: string, is_income = false) => ({
    id,
    name,
    is_income,
    group_id: 'g1',
    hidden: false,
  });

  it('returns empty sets for no categories', () => {
    const { incomeCategories, investmentSavingsCategories } = classifier.classify([]);
    expect(incomeCategories.size).toBe(0);
    expect(investmentSavingsCategories.size).toBe(0);
  });

  it('adds income category to incomeCategories set', () => {
    const cats = [makeCategory('c1', 'Salary', true)];
    const { incomeCategories } = classifier.classify(cats);
    expect(incomeCategories.has('c1')).toBe(true);
  });

  it('does not add non-income category to incomeCategories set', () => {
    const cats = [makeCategory('c1', 'Groceries', false)];
    const { incomeCategories } = classifier.classify(cats);
    expect(incomeCategories.has('c1')).toBe(false);
  });

  it('adds category containing "investment" to investmentSavingsCategories', () => {
    const cats = [makeCategory('c1', 'Stock Investment', false)];
    const { investmentSavingsCategories } = classifier.classify(cats);
    expect(investmentSavingsCategories.has('c1')).toBe(true);
  });

  it('adds category containing "savings" to investmentSavingsCategories', () => {
    const cats = [makeCategory('c2', 'Emergency Savings', false)];
    const { investmentSavingsCategories } = classifier.classify(cats);
    expect(investmentSavingsCategories.has('c2')).toBe(true);
  });

  it('adds category containing "vacation" to investmentSavingsCategories', () => {
    const cats = [makeCategory('c3', 'Vacation Fund', false)];
    const { investmentSavingsCategories } = classifier.classify(cats);
    expect(investmentSavingsCategories.has('c3')).toBe(true);
  });

  it('is case-insensitive for keyword matching', () => {
    const cats = [makeCategory('c4', 'SAVINGS ACCOUNT', false)];
    const { investmentSavingsCategories } = classifier.classify(cats);
    expect(investmentSavingsCategories.has('c4')).toBe(true);
  });

  it('does not add regular expense category to investmentSavingsCategories', () => {
    const cats = [makeCategory('c5', 'Groceries', false)];
    const { investmentSavingsCategories } = classifier.classify(cats);
    expect(investmentSavingsCategories.has('c5')).toBe(false);
  });

  it('category can be both income and investment/savings', () => {
    const cats = [makeCategory('c6', 'Savings Interest', true)];
    const { incomeCategories, investmentSavingsCategories } = classifier.classify(cats);
    expect(incomeCategories.has('c6')).toBe(true);
    expect(investmentSavingsCategories.has('c6')).toBe(true);
  });

  it('handles multiple categories correctly', () => {
    const cats = [
      makeCategory('c1', 'Salary', true),
      makeCategory('c2', 'Groceries', false),
      makeCategory('c3', 'Investments', false),
    ];
    const { incomeCategories, investmentSavingsCategories } = classifier.classify(cats);
    expect(incomeCategories.size).toBe(1);
    expect(investmentSavingsCategories.size).toBe(1);
  });
});
