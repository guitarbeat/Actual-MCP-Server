import { describe, expect, it } from 'vitest';
import { parseBalanceHistoryInput } from './input-parser.js';

describe('parseBalanceHistoryInput', () => {
  it('passes through accountId', () => {
    const result = parseBalanceHistoryInput({
      accountId: 'acc-123',
      includeOffBudget: false,
      months: 6,
    });
    expect(result.accountId).toBe('acc-123');
  });

  it('defaults includeOffBudget to false when not a boolean', () => {
    const result = parseBalanceHistoryInput({
      accountId: 'acc-1',
      includeOffBudget: undefined as unknown as boolean,
      months: 6,
    });
    expect(result.includeOffBudget).toBe(false);
  });

  it('passes through includeOffBudget: true', () => {
    const result = parseBalanceHistoryInput({
      accountId: 'acc-1',
      includeOffBudget: true,
      months: 6,
    });
    expect(result.includeOffBudget).toBe(true);
  });

  it('defaults months to 12 when months is 0', () => {
    const result = parseBalanceHistoryInput({
      accountId: 'acc-1',
      includeOffBudget: false,
      months: 0,
    });
    expect(result.months).toBe(12);
  });

  it('defaults months to 12 when months is negative', () => {
    const result = parseBalanceHistoryInput({
      accountId: 'acc-1',
      includeOffBudget: false,
      months: -5,
    });
    expect(result.months).toBe(12);
  });

  it('defaults months to 12 when months is not a number', () => {
    const result = parseBalanceHistoryInput({
      accountId: 'acc-1',
      includeOffBudget: false,
      months: undefined as unknown as number,
    });
    expect(result.months).toBe(12);
  });

  it('passes through a valid positive months value', () => {
    const result = parseBalanceHistoryInput({
      accountId: 'acc-1',
      includeOffBudget: false,
      months: 6,
    });
    expect(result.months).toBe(6);
  });
});
