import { describe, expect, it, vi } from 'vitest';
import {
  readGetTransactionsDefaultLimit,
  resolveGetTransactionsPagination,
  GET_TRANSACTIONS_FALLBACK_DEFAULT_LIMIT,
} from './pagination.js';

describe('get-transactions pagination', () => {
  it('applies fallback default limit when omitting limit', () => {
    const resolved = resolveGetTransactionsPagination({});
    expect(resolved.limit).toBe(readGetTransactionsDefaultLimit());
    expect(resolved.defaultedLimit).toBe(true);
    expect(resolved.offset).toBe(0);
  });

  it('honours explicit offset and limit', () => {
    expect(resolveGetTransactionsPagination({ limit: 5, offset: 10 }).limit).toBe(5);
    expect(resolveGetTransactionsPagination({ limit: 5, offset: 10 }).offset).toBe(10);
    expect(resolveGetTransactionsPagination({ limit: 5, offset: 10 }).defaultedLimit).toBe(false);
  });

  it('caps limit to env maximum', () => {
    vi.stubEnv('ACTUAL_GET_TRANSACTIONS_MAX_LIMIT', '10');

    expect(resolveGetTransactionsPagination({ limit: 999 }).limit).toBe(10);
    expect(resolveGetTransactionsPagination({ limit: 999 }).cappedToMax).toBe(true);

    vi.unstubAllEnvs();
  });

  it('reads default limit env override within absolute max', () => {
    vi.stubEnv('ACTUAL_GET_TRANSACTIONS_DEFAULT_LIMIT', '50');
    vi.stubEnv('ACTUAL_GET_TRANSACTIONS_MAX_LIMIT', '5000');

    expect(resolveGetTransactionsPagination({}).limit).toBe(50);

    vi.unstubAllEnvs();
    expect(GET_TRANSACTIONS_FALLBACK_DEFAULT_LIMIT).toBe(200);
  });
});
