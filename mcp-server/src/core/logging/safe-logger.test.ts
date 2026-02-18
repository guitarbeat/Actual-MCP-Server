import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
});
