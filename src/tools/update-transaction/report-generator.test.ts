import { describe, it, expect } from 'vitest';
import { UpdateTransactionReportGenerator } from './report-generator.js';

describe('UpdateTransactionReportGenerator', () => {
  const generator = new UpdateTransactionReportGenerator();

  it('should generate report with all updated fields', () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      categoryId: '550e8400-e29b-41d4-a716-446655440001',
      payeeId: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Updated notes',
      amount: 5000,
    };

    const result = generator.generate(input, '550e8400-e29b-41d4-a716-446655440000');

    expect(result).toContain('Successfully updated transaction');
    expect(result).toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(result).toContain('category');
    expect(result).toContain('payee');
    expect(result).toContain('notes');
    expect(result).toContain('amount');
  });

  it('should generate report with only some updated fields', () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      notes: 'Just notes',
    };

    const result = generator.generate(input, '550e8400-e29b-41d4-a716-446655440000');

    expect(result).toContain('Successfully updated transaction');
    expect(result).toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(result).toContain('notes');
    expect(result).not.toContain('category');
    expect(result).not.toContain('payee');
    expect(result).not.toContain('amount');
  });

  it('should generate basic report when no fields updated', () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = generator.generate(input, '550e8400-e29b-41d4-a716-446655440000');

    expect(result).toContain('Successfully updated transaction');
    expect(result).toContain('550e8400-e29b-41d4-a716-446655440000');
  });
});
