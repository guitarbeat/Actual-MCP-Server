
import { describe, expect, it } from 'vitest';
import { CreateTransactionSchema } from './index.js';

describe('CreateTransactionSchema', () => {
  describe('Security Limits', () => {
    it('should reject string lengths exceeding limits', () => {
      const longString = 'a'.repeat(101); // Limit is 100
      const longNote = 'a'.repeat(501); // Limit is 500

      const result = CreateTransactionSchema.safeParse({
        account: longString,
        date: '2025-01-01',
        amount: 100,
        payee: longString,
        category: longString,
        notes: longNote,
        subtransactions: [
          {
            amount: 50,
            category: longString,
            notes: longNote,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.errors.map(e => e.message);
        expect(errors).toContain('Account name must be less than 100 characters');
        expect(errors).toContain('Payee name must be less than 100 characters');
        expect(errors).toContain('Category name must be less than 100 characters');
        expect(errors).toContain('Notes must be less than 500 characters');
      }
    });

    it('should accept strings within limits', () => {
      const validString = 'a'.repeat(100);
      const validNote = 'a'.repeat(500);

      const result = CreateTransactionSchema.safeParse({
        account: validString,
        date: '2025-01-01',
        amount: 100,
        payee: validString,
        category: validString,
        notes: validNote,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Core Validation', () => {
    it('should require account name', () => {
      // Test missing field
      const missingResult = CreateTransactionSchema.safeParse({
        date: '2025-01-01',
        amount: 100,
      });
      expect(missingResult.success).toBe(false);

      // Test empty string (min 1 check)
      const emptyResult = CreateTransactionSchema.safeParse({
        account: '',
        date: '2025-01-01',
        amount: 100,
      });
      expect(emptyResult.success).toBe(false);
      if (!emptyResult.success) {
        expect(emptyResult.error.errors[0].message).toContain('Account is required');
      }
    });

    it('should validate date format YYYY-MM-DD', () => {
      const result = CreateTransactionSchema.safeParse({
        account: 'Checking',
        date: '2025/01/01', // Invalid format
        amount: 100,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Date must be in YYYY-MM-DD format');
      }
    });

    it('should accept valid numeric amounts', () => {
      const result = CreateTransactionSchema.safeParse({
        account: 'Checking',
        date: '2025-01-01',
        amount: -50.25,
      });
      expect(result.success).toBe(true);
    });

    it('should validate subtransactions structure', () => {
      const result = CreateTransactionSchema.safeParse({
        account: 'Checking',
        date: '2025-01-01',
        amount: 100,
        subtransactions: [
          {
            amount: 50,
            // category and notes are optional
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
