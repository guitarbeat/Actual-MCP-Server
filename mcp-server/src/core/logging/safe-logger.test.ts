import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatMessage } from './safe-logger.js';

describe('formatMessage', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset NODE_ENV before each test
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Restore NODE_ENV after each test
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should include stack trace in development environment', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Test error');
    const result = formatMessage([error]);
    expect(result).toContain('Test error');
    expect(result).toContain(error.stack);
  });

  it('should include stack trace in test environment', () => {
    process.env.NODE_ENV = 'test';
    const error = new Error('Test error');
    const result = formatMessage([error]);
    expect(result).toContain('Test error');
    expect(result).toContain(error.stack);
  });

  // This test expects correct behavior (no leakage)
  it('should NOT include stack trace in production environment', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Test error');
    const result = formatMessage([error]);
    expect(result).toContain('Test error');
    expect(result).not.toContain(error.stack);
  });

  it('should redact sensitive keys in objects', () => {
    const data = {
      username: 'jdoe',
      password: 'secretPassword123',
      apiKey: 'xyz-123',
      nested: {
        accessToken: 'token-abc',
        publicData: 'visible',
      },
    };
    const result = formatMessage([data]);

    expect(result).toContain('jdoe');
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('secretPassword123');
    expect(result).not.toContain('xyz-123');
    expect(result).not.toContain('token-abc');
    expect(result).toContain('visible');
  });

  it('should redact Bearer tokens in strings', () => {
    const str = 'Request failed with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const result = formatMessage([str]);

    expect(result).toContain('Request failed with Authorization: Bearer [REDACTED]');
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });
});
