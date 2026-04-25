import { describe, it, expect } from 'vitest';
import { redactValue } from './redactor.js';

describe('redactValue', () => {
  it('should redact sensitive keys', () => {
    expect(redactValue('password', 'secret123')).toBe('[REDACTED]');
    expect(redactValue('apiKey', 'sk_live_123')).toBe('[REDACTED]');
    expect(redactValue('authorization', 'Bearer token')).toBe('[REDACTED]');
    expect(redactValue('secret', 'my-secret')).toBe('[REDACTED]');
  });

  it('should redact Bearer tokens in strings', () => {
    const input = 'Request with Authorization: Bearer secret-token-123 failed';
    const result = redactValue('', input);
    expect(result).toBe('Request with Authorization: Bearer [REDACTED] failed');
  });

  it('should NOT redact safe keys', () => {
    expect(redactValue('author', 'John Doe')).toBe('John Doe');
    expect(redactValue('authentication', 'public')).toBe('public');
    expect(redactValue('authority', 'admin')).toBe('admin');
  });

  it('should NOT redact usage metrics with token in name', () => {
    expect(redactValue('input_tokens', 150)).toBe(150);
    expect(redactValue('output_tokens', 50)).toBe(50);
    expect(redactValue('max_tokens', 1000)).toBe(1000);
  });

  it('should redact standalone token key', () => {
    expect(redactValue('token', 'secret-token')).toBe('[REDACTED]');
  });

  it('should handle non-string values gracefully', () => {
    expect(redactValue('someKey', 123)).toBe(123);
    expect(redactValue('someKey', { a: 1 })).toEqual({ a: 1 });
    expect(redactValue('someKey', null)).toBe(null);
  });
});
