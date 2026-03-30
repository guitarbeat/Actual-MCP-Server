import { describe, expect, it } from 'vitest';
import { normalizeUnknownError, serializeUnknownError } from './error-serialization.js';

describe('error-serialization', () => {
  it('serializes plain objects with their own fields', () => {
    expect(
      serializeUnknownError({
        message: 'Tool call failed',
        code: 'E_API',
        details: { retryable: false },
      }),
    ).toBe('{"message":"Tool call failed","code":"E_API","details":{"retryable":false}}');
  });

  it('preserves Error messages without inflating them', () => {
    expect(serializeUnknownError(new Error('Connection failed'))).toBe('Connection failed');
  });

  it('normalizes non-Error throwables into Error instances', () => {
    const normalized = normalizeUnknownError({ message: 'Oops', code: 500 });
    expect(normalized).toBeInstanceOf(Error);
    expect(normalized.message).toBe('{"message":"Oops","code":500}');
  });
});
