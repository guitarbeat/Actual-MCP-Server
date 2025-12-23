import { describe, expect, it } from 'vitest';
import {
  assertMonth,
  assertPositiveIntegerCents,
  assertUuid,
  validateAmount,
  validateDate,
  validateMonth,
  validateUUID,
} from './validators.js';

describe('Backward Compatibility - validators re-exports', () => {
  it('should export validateUUID from core', () => {
    expect(typeof validateUUID).toBe('function');
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should export validateDate from core', () => {
    expect(typeof validateDate).toBe('function');
    expect(validateDate('2024-01-15')).toBe(true);
  });

  it('should export validateAmount from core', () => {
    expect(typeof validateAmount).toBe('function');
    expect(validateAmount(100)).toBe(true);
  });

  it('should export validateMonth from core', () => {
    expect(typeof validateMonth).toBe('function');
    expect(validateMonth('2024-01')).toBe(true);
  });

  it('should export assertUuid from core', () => {
    expect(typeof assertUuid).toBe('function');
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(assertUuid(uuid, 'testId')).toBe(uuid);
  });

  it('should export assertMonth from core', () => {
    expect(typeof assertMonth).toBe('function');
    expect(assertMonth('2024-01', 'month')).toBe('2024-01');
  });

  it('should export assertPositiveIntegerCents from core', () => {
    expect(typeof assertPositiveIntegerCents).toBe('function');
    expect(assertPositiveIntegerCents(100, 'amount')).toBe(100);
  });
});
