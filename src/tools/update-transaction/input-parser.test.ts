import { describe, it, expect } from 'vitest';
import { UpdateTransactionInputParser } from './input-parser.js';

describe('UpdateTransactionInputParser', () => {
  const parser = new UpdateTransactionInputParser();

  it('should parse valid transaction update with all fields', () => {
    const result = parser.parse({
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      categoryId: '550e8400-e29b-41d4-a716-446655440001',
      payeeId: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Updated notes',
      amount: 5000,
    });

    expect(result.transactionId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(result.payeeId).toBe('550e8400-e29b-41d4-a716-446655440002');
    expect(result.notes).toBe('Updated notes');
    expect(result.amount).toBe(5000);
  });

  it('should parse transaction update with only required fields', () => {
    const result = parser.parse({
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.transactionId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.categoryId).toBeUndefined();
    expect(result.payeeId).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.amount).toBeUndefined();
  });

  it('should reject invalid transaction ID', () => {
    expect(() => {
      parser.parse({
        transactionId: 'invalid-uuid',
      });
    }).toThrow();
  });

  it('should reject invalid category ID', () => {
    expect(() => {
      parser.parse({
        transactionId: '550e8400-e29b-41d4-a716-446655440000',
        categoryId: 'invalid-uuid',
      });
    }).toThrow();
  });

  it('should reject invalid payee ID', () => {
    expect(() => {
      parser.parse({
        transactionId: '550e8400-e29b-41d4-a716-446655440000',
        payeeId: 'invalid-uuid',
      });
    }).toThrow();
  });

  it('should reject negative amount', () => {
    expect(() => {
      parser.parse({
        transactionId: '550e8400-e29b-41d4-a716-446655440000',
        amount: -100,
      });
    }).toThrow();
  });
});
