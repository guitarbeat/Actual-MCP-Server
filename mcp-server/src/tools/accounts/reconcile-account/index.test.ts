import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchSnapshot = vi.fn();
const mockClearTransactions = vi.fn();

vi.mock('./data-fetcher.js', () => ({
  ReconcileAccountDataFetcher: vi.fn().mockImplementation(() => ({
    fetchSnapshot: (...args: unknown[]) => mockFetchSnapshot(...args),
    clearTransactions: (...args: unknown[]) => mockClearTransactions(...args),
  })),
}));

import { handler } from './index.js';

function parseJsonResponse(response: Awaited<ReturnType<typeof handler>>): Record<string, unknown> {
  const firstContent = response.content[0];

  if (!('text' in firstContent)) {
    throw new Error('Expected text content');
  }

  return JSON.parse(firstContent.text) as Record<string, unknown>;
}

describe('reconcile-account handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forces clearing when forceClear is enabled even if the account is out of balance', async () => {
    mockFetchSnapshot.mockResolvedValue({
      accountId: 'account-1',
      accountName: 'Checking',
      statementDate: '2025-01-31',
      statementBalanceCents: 10000,
      actualBalanceCents: 9500,
      clearedBalanceCents: 9000,
      unclearedBalanceCents: 500,
      differenceCents: 500,
      eligibleTransactions: [
        {
          id: 'txn-1',
          account: 'account-1',
          date: '2025-01-15',
          amount: -500,
          payee_name: 'Utility',
        },
      ],
      unclearedTransactions: [
        {
          id: 'txn-1',
          account: 'account-1',
          date: '2025-01-15',
          amount: -500,
          payee_name: 'Utility',
        },
      ],
      futureTransactionsIgnored: 0,
    });
    mockClearTransactions.mockResolvedValue(1);

    const response = await handler({
      account: 'Checking',
      statementBalance: 100,
      statementDate: '2025-01-31',
      forceClear: true,
    });
    const payload = parseJsonResponse(response);

    expect(mockClearTransactions).toHaveBeenCalledWith([
      {
        id: 'txn-1',
        account: 'account-1',
        date: '2025-01-15',
        amount: -500,
        payee_name: 'Utility',
      },
    ]);
    expect(payload.status).toBe('forced-clear');
    expect(payload.transactionsCleared).toBe(1);
  });
});
