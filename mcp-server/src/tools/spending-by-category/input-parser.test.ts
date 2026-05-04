import { describe, expect, it } from 'vitest';
import { parseSpendingByCategoryInput } from './input-parser.js';

describe('parseSpendingByCategoryInput', () => {
  it('throws when args is null', () => {
    expect(() => parseSpendingByCategoryInput(null)).toThrow('Arguments must be an object');
  });

  it('throws when args is not an object', () => {
    expect(() => parseSpendingByCategoryInput('string')).toThrow('Arguments must be an object');
  });

  it('throws when startDate is missing', () => {
    expect(() => parseSpendingByCategoryInput({ endDate: '2024-06-30' })).toThrow(
      'startDate is required',
    );
  });

  it('throws when startDate is not a string', () => {
    expect(() => parseSpendingByCategoryInput({ startDate: 123, endDate: '2024-06-30' })).toThrow(
      'startDate is required and must be a string',
    );
  });

  it('throws when endDate is missing', () => {
    expect(() => parseSpendingByCategoryInput({ startDate: '2024-01-01' })).toThrow(
      'endDate is required',
    );
  });

  it('throws when endDate is not a string', () => {
    expect(() => parseSpendingByCategoryInput({ startDate: '2024-01-01', endDate: true })).toThrow(
      'endDate is required and must be a string',
    );
  });

  it('returns valid input with defaults', () => {
    const result = parseSpendingByCategoryInput({ startDate: '2024-01-01', endDate: '2024-06-30' });
    expect(result.startDate).toBe('2024-01-01');
    expect(result.endDate).toBe('2024-06-30');
    expect(result.accountId).toBeUndefined();
    expect(result.includeIncome).toBe(false);
  });

  it('passes through accountId when valid string', () => {
    const result = parseSpendingByCategoryInput({
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      accountId: 'acc-123',
    });
    expect(result.accountId).toBe('acc-123');
  });

  it('ignores accountId when not a string', () => {
    const result = parseSpendingByCategoryInput({
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      accountId: 42,
    });
    expect(result.accountId).toBeUndefined();
  });

  it('passes through includeIncome: true', () => {
    const result = parseSpendingByCategoryInput({
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      includeIncome: true,
    });
    expect(result.includeIncome).toBe(true);
  });

  it('defaults includeIncome to false when not a boolean', () => {
    const result = parseSpendingByCategoryInput({
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      includeIncome: 'yes',
    });
    expect(result.includeIncome).toBe(false);
  });
});
