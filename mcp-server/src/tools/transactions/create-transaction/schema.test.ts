import { describe, expect, it } from 'vitest';
import { CreateTransactionSchema } from './index.js';

describe('CreateTransactionSchema', () => {
  it('should validate valid transaction data', () => {
    const validData = {
      account: 'Checking',
      date: '2023-10-27',
      amount: 100.0,
      payee: 'Grocery Store',
      category: 'Food',
      notes: 'Weekly groceries',
      cleared: false,
    };

    const result = CreateTransactionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should validate transaction with subtransactions', () => {
    const validData = {
      account: 'Checking',
      date: '2023-10-27',
      amount: 100.0,
      subtransactions: [
        { amount: 50.0, category: 'Food' },
        { amount: 50.0, category: 'Supplies' },
      ],
    };

    const result = CreateTransactionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail on invalid date format', () => {
    const invalidData = {
      account: 'Checking',
      date: '27-10-2023',
      amount: 100.0,
    };

    const result = CreateTransactionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Date must be in YYYY-MM-DD format');
    }
  });

  it('should fail on missing account', () => {
    const invalidData = {
      date: '2023-10-27',
      amount: 100.0,
    };

    const result = CreateTransactionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail when account name is too long', () => {
    const invalidData = {
      account: 'a'.repeat(101),
      date: '2023-10-27',
      amount: 100.0,
    };

    const result = CreateTransactionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        'Account name must be less than 100 characters',
      );
    }
  });

  it('should fail when payee name is too long', () => {
    const invalidData = {
      account: 'Checking',
      date: '2023-10-27',
      amount: 100.0,
      payee: 'a'.repeat(101),
    };

    const result = CreateTransactionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        'Payee name must be less than 100 characters',
      );
    }
  });

  it('should fail when notes are too long', () => {
    const invalidData = {
      account: 'Checking',
      date: '2023-10-27',
      amount: 100.0,
      notes: 'a'.repeat(501),
    };

    const result = CreateTransactionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Notes must be less than 500 characters');
    }
  });
});
