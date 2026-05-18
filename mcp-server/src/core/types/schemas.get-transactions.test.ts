import { describe, expect, it } from 'vitest';
import { GetTransactionsArgsSchema } from './schemas.js';

describe('GetTransactionsArgsSchema', () => {
  it('parses minimal args and defaults outputFormat to markdown', () => {
    const r = GetTransactionsArgsSchema.safeParse({ accountId: '🏦 Chase Checking' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.outputFormat).toBe('markdown');
    }
  });

  it('accepts outputFormat json', () => {
    const r = GetTransactionsArgsSchema.safeParse({
      accountId: '🏦 Chase Checking',
      outputFormat: 'json',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.outputFormat).toBe('json');
    }
  });

  it('rejects invalid outputFormat', () => {
    const r = GetTransactionsArgsSchema.safeParse({
      accountId: '🏦 Chase Checking',
      outputFormat: 'xml',
    });
    expect(r.success).toBe(false);
  });
});
