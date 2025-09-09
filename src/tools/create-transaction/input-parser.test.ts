// Unit tests for create-transaction input parser

import { describe, it, expect } from 'vitest';
import { CreateTransactionInputParser } from './input-parser.js';

describe('CreateTransactionInputParser', () => {
  const parser = new CreateTransactionInputParser();

  describe('parse - happy path', () => {
    it('should parse valid minimal input', () => {
      const input = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
      };

      const result = parser.parse(input);

      expect(result).toEqual({
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        payee: undefined,
        category: undefined,
        categoryGroup: undefined,
        notes: undefined,
        cleared: true, // default
      });
    });

    it('should parse complete input with all fields', () => {
      const input = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        payee: 'Grocery Store',
        category: 'Food',
        notes: 'Weekly groceries',
        cleared: false,
      };

      const result = parser.parse(input);

      expect(result).toEqual({
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        payee: 'Grocery Store',
        category: 'Food',
        categoryGroup: undefined,
        notes: 'Weekly groceries',
        cleared: false,
      });
    });
  });

  describe('parse - validation errors', () => {
    it('should throw error for non-object input', () => {
      expect(() => parser.parse(null)).toThrow('Arguments must be an object');
      expect(() => parser.parse('string')).toThrow('Arguments must be an object');
    });

    it('should throw error for missing accountId', () => {
      const input = { date: '2023-12-15', amount: 25.5 };
      expect(() => parser.parse(input)).toThrow('accountId is required and must be a string');
    });

    it('should throw error for missing date', () => {
      const input = { accountId: 'account-123', amount: 25.5 };
      expect(() => parser.parse(input)).toThrow('date is required and must be a string (YYYY-MM-DD)');
    });

    it('should throw error for missing amount', () => {
      const input = { accountId: 'account-123', date: '2023-12-15' };
      expect(() => parser.parse(input)).toThrow('amount is required and must be a number');
    });

    it('should throw error for invalid date format', () => {
      const input = { accountId: 'account-123', date: '12/15/2023', amount: 25.5 };
      expect(() => parser.parse(input)).toThrow('date must be in YYYY-MM-DD format');
    });

    it('should throw error when both category and categoryGroup are specified', () => {
      const input = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        category: 'Food',
        categoryGroup: 'Expenses',
      };
      expect(() => parser.parse(input)).toThrow('Cannot specify both category and categoryGroup');
    });
  });

  describe('parse - edge cases', () => {
    it('should handle negative amounts', () => {
      const input = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: -50.0,
      };

      const result = parser.parse(input);
      expect(result.amount).toBe(-50.0);
    });

    it('should handle zero amounts', () => {
      const input = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 0,
      };

      const result = parser.parse(input);
      expect(result.amount).toBe(0);
    });
  });
});
