import { describe, expect, it } from 'vitest';
import { parseMonthlySummaryInput } from './input-parser.js';

describe('parseMonthlySummaryInput', () => {
  it('throws when args is null', () => {
    expect(() => parseMonthlySummaryInput(null)).toThrow('Arguments must be an object');
  });

  it('throws when args is a string', () => {
    expect(() => parseMonthlySummaryInput('invalid')).toThrow('Arguments must be an object');
  });

  it('defaults months to 3 when not provided', () => {
    const result = parseMonthlySummaryInput({});
    expect(result.months).toBe(3);
  });

  it('defaults months to 3 when months is 0', () => {
    const result = parseMonthlySummaryInput({ months: 0 });
    expect(result.months).toBe(3);
  });

  it('defaults months to 3 when months is negative', () => {
    const result = parseMonthlySummaryInput({ months: -1 });
    expect(result.months).toBe(3);
  });

  it('accepts a valid positive months value', () => {
    const result = parseMonthlySummaryInput({ months: 12 });
    expect(result.months).toBe(12);
  });

  it('returns undefined accountId when not provided', () => {
    const result = parseMonthlySummaryInput({ months: 3 });
    expect(result.accountId).toBeUndefined();
  });

  it('returns undefined accountId when empty string provided', () => {
    const result = parseMonthlySummaryInput({ months: 3, accountId: '' });
    expect(result.accountId).toBeUndefined();
  });

  it('returns accountId when valid string provided', () => {
    const result = parseMonthlySummaryInput({ months: 3, accountId: 'acc-123' });
    expect(result.accountId).toBe('acc-123');
  });

  it('ignores non-string accountId', () => {
    const result = parseMonthlySummaryInput({ months: 3, accountId: 123 });
    expect(result.accountId).toBeUndefined();
  });
});
