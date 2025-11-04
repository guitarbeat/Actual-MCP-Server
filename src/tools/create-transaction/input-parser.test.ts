// Unit tests for create-transaction input parser

import { describe, it, expect } from 'vitest';
import { CreateTransactionInputParser } from './input-parser.js';

describe('CreateTransactionInputParser', () => {
  const parser = new CreateTransactionInputParser();

  describe('parse - happy path', () => {
    it('should parse valid minimal input', () => {
      const input = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2023-12-15',
        amount: 2550,
      };

      const result = parser.parse(input);

      expect(result).toEqual({
        input: {
          accountId: '123e4567-e89b-12d3-a456-426614174000',
          date: '2023-12-15',
          amount: 2550,
          payee: undefined,
          category: undefined,
          categoryGroup: undefined,
          notes: undefined,
          cleared: true, // default
        },
        warnings: [],
      });
    });

    it('should parse complete input with all fields', () => {
      const input = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2023-12-15',
        amount: 2550,
        payee: 'Grocery Store',
        category: 'Food',
        notes: 'Weekly groceries',
        cleared: false,
      };

      const result = parser.parse(input);

      expect(result).toEqual({
        input: {
          accountId: '123e4567-e89b-12d3-a456-426614174000',
          date: '2023-12-15',
          amount: 2550,
          payee: 'Grocery Store',
          category: 'Food',
          categoryGroup: undefined,
          notes: 'Weekly groceries',
          cleared: false,
        },
        warnings: [],
      });
    });
  });

  describe('parse - validation errors', () => {
    it('should throw error for non-object input', () => {
      expect(() => parser.parse(null)).toThrow('Arguments must be an object');
      expect(() => parser.parse('string')).toThrow('Arguments must be an object');
    });

    it('should throw error for missing accountId', () => {
      const input = { date: '2023-12-15', amount: 2550 };
      expect(() => parser.parse(input)).toThrow('accountId is required and must be a valid UUID');
    });

    it('should throw error for missing date', () => {
      const input = { accountId: '123e4567-e89b-12d3-a456-426614174000', amount: 2550 };
      expect(() => parser.parse(input)).toThrow('date is required and must be a string (YYYY-MM-DD)');
    });

    it('should throw error for missing amount', () => {
      const input = { accountId: '123e4567-e89b-12d3-a456-426614174000', date: '2023-12-15' };
      expect(() => parser.parse(input)).toThrow('amount is required and must be a positive integer amount in cents');
    });

    it('should throw error for invalid date format', () => {
      const input = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        date: '12/15/2023',
        amount: 2550,
      };
      expect(() => parser.parse(input)).toThrow('date must be in YYYY-MM-DD format');
    });

    it('should throw error when both category and categoryGroup are specified', () => {
      const input = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2023-12-15',
        amount: 2550,
        category: 'Food',
        categoryGroup: 'Expenses',
      };
      expect(() => parser.parse(input)).toThrow('Cannot specify both category and categoryGroup');
    });

    it('should throw error for invalid accountId format', () => {
      const input = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 2550,
      };
      expect(() => parser.parse(input)).toThrow('accountId must be a valid UUID');
    });

    it('should throw error for non-integer amount', () => {
      const input = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2023-12-15',
        amount: 25.5,
      };
      expect(() => parser.parse(input)).toThrow('amount must be a positive integer amount in cents');
    });

    it('should throw error for negative amount', () => {
      const input = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2023-12-15',
        amount: -1000,
      };
      expect(() => parser.parse(input)).toThrow('amount must be a positive integer amount in cents');
    });
  });

  describe('parse - edge cases', () => {
    it('should allow large integer amounts', () => {
      const input = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2023-12-15',
        amount: 1250000,
      };

      const result = parser.parse(input);
      expect(result.input.amount).toBe(1250000);
    });

    it('should include warning for unusually small cent amounts', () => {
      const input = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2023-12-15',
        amount: 3,
      };

      const result = parser.parse(input);

      expect(result.input.amount).toBe(3);
      expect(result.warnings).toEqual([
        'Amount $0.03 is unusually small; please confirm the cents value.',
      ]);
    });
  });
});
