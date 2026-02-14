import { describe, it, expect } from 'vitest';
import { formatMessage } from './safe-logger.js';

describe('formatMessage Redaction', () => {
  it('should redact sensitive keys in objects', () => {
    const sensitiveData = {
      username: 'user',
      password: 'secretPassword123',
      apiKey: 'sk_live_12345',
      nested: {
        authorization: 'Bearer token123',
      },
    };

    const result = formatMessage([sensitiveData]);

    // VERIFICATION: Values should be redacted
    expect(result).not.toContain('secretPassword123');
    expect(result).toContain('"password": "[REDACTED]"');

    expect(result).not.toContain('sk_live_12345');
    expect(result).toContain('"apiKey": "[REDACTED]"');

    // The 'authorization' key matches the regex, so it should be fully redacted
    expect(result).not.toContain('Bearer token123');
    expect(result).toContain('"authorization": "[REDACTED]"');
  });

  it('should NOT redact safe keys like "author"', () => {
    const safeData = {
      author: 'John Doe',
      authentication: 'public',
      authority: 'admin',
    };

    const result = formatMessage([safeData]);

    expect(result).toContain('"author": "John Doe"');
    // These should also be safe with the refined regex
    expect(result).toContain('"authentication": "public"');
    expect(result).toContain('"authority": "admin"');
  });

  it('should NOT redact usage metrics like "input_tokens"', () => {
    const usageData = {
      input_tokens: 150,
      output_tokens: 50,
      max_tokens: 1000,
      token: 'secret-value', // This SHOULD be redacted
    };

    const result = formatMessage([usageData]);

    // Usage metrics should be visible
    expect(result).toContain('"input_tokens": 150');
    expect(result).toContain('"output_tokens": 50');
    expect(result).toContain('"max_tokens": 1000');

    // The actual token key should be redacted
    expect(result).toContain('"token": "[REDACTED]"');
  });

  it('should redact Bearer tokens in strings', () => {
    const logString = 'Request with Authorization: Bearer secret-token-123 failed';
    const result = formatMessage([logString]);

    expect(result).not.toContain('secret-token-123');
    expect(result).toContain('Bearer [REDACTED]');
  });
});
