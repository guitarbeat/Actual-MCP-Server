import { describe, it, expect } from 'vitest';
import { CategoryClassifier } from '../core/mapping/category-classifier.js';
import type { Category } from '../core/types/domain.js';

describe('CategoryClassifier', () => {
  const classifier = new CategoryClassifier();

  const mockCategories: Category[] = [
    { id: 'cat_income', name: 'Income', is_income: true, group_id: 'group_1', hidden: false },
    { id: 'cat_interest', name: 'Interest', is_income: true, group_id: 'group_1', hidden: false },
    {
      id: 'cat_groceries',
      name: 'Groceries',
      is_income: false,
      group_id: 'group_2',
      hidden: false,
    },
    { id: 'cat_shopping', name: 'Shopping', is_income: false, group_id: 'group_2', hidden: false },
    {
      id: 'cat_transportation',
      name: 'Transportation',
      is_income: false,
      group_id: 'group_2',
      hidden: false,
    },
    {
      id: 'cat_restaurants',
      name: 'Restaurants',
      is_income: false,
      group_id: 'group_2',
      hidden: false,
    },
    { id: 'cat_rent', name: 'Rent', is_income: false, group_id: 'group_3', hidden: false },
    {
      id: 'cat_investment',
      name: 'Investment',
      is_income: false,
      group_id: 'group_3',
      hidden: false,
    },
    { id: 'cat_savings', name: 'Savings', is_income: false, group_id: 'group_3', hidden: false },
  ];

  describe('classify', () => {
    it('should correctly classify income and investment/savings categories', () => {
      const result = classifier.classify(mockCategories);

      expect(result.incomeCategories.has('cat_income')).toBe(true);
      expect(result.incomeCategories.has('cat_interest')).toBe(true);

      expect(result.investmentSavingsCategories.has('cat_investment')).toBe(true);
      expect(result.investmentSavingsCategories.has('cat_savings')).toBe(true);
      expect(result.investmentSavingsCategories.has('cat_groceries')).toBe(false);
    });
  });

  describe('classifyTransaction', () => {
    it('should classify payroll as income when amount is positive', () => {
      const categoryId = classifier.classifyTransaction(
        { payee_name: 'Acme Corp Payroll', amount: 500000 },
        mockCategories,
      );
      expect(categoryId).toBe('cat_income');
    });

    it('should classify interest as interest when amount is positive', () => {
      const categoryId = classifier.classifyTransaction(
        { payee_name: 'Bank Interest', amount: 1500 },
        mockCategories,
      );
      expect(categoryId).toBe('cat_interest');
    });

    it('should classify amazon as shopping', () => {
      const categoryId = classifier.classifyTransaction(
        { payee_name: 'Amazon.com', amount: -4500 },
        mockCategories,
      );
      expect(categoryId).toBe('cat_shopping');
    });

    it('should classify whole foods as groceries', () => {
      const categoryId = classifier.classifyTransaction(
        { payee_name: 'Whole Foods Market', amount: -12050 },
        mockCategories,
      );
      expect(categoryId).toBe('cat_groceries');
    });

    it('should classify uber as transportation', () => {
      const categoryId = classifier.classifyTransaction(
        { payee_name: 'Uber Trip', amount: -2500 },
        mockCategories,
      );
      expect(categoryId).toBe('cat_transportation');
    });

    it('should classify starbucks as restaurants', () => {
      const categoryId = classifier.classifyTransaction(
        { payee_name: 'Starbucks Store', amount: -550 },
        mockCategories,
      );
      expect(categoryId).toBe('cat_restaurants');
    });

    it('should classify large even negative amounts as rent/mortgage', () => {
      const categoryId = classifier.classifyTransaction(
        { payee_name: 'Unknown Property Management', amount: -150000 }, // -$1500.00
        mockCategories,
      );
      expect(categoryId).toBe('cat_rent');
    });

    it('should return null for unknown payees with non-matching amounts', () => {
      const categoryId = classifier.classifyTransaction(
        { payee_name: 'Random Store', amount: -4200 },
        mockCategories,
      );
      expect(categoryId).toBeNull();
    });

    it('should return null for null payee names', () => {
      const categoryId = classifier.classifyTransaction(
        { payee_name: null, amount: -4200 },
        mockCategories,
      );
      expect(categoryId).toBeNull();
    });
  });
});
