import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const { mockImportTransactions, mockResolveAccount, mockResolveCategory, mockResolvePayee } =
  vi.hoisted(() => ({
    mockImportTransactions: vi.fn(),
    mockResolveAccount: vi.fn(),
    mockResolveCategory: vi.fn(),
    mockResolvePayee: vi.fn(),
  }));

vi.mock('../../../core/api/actual-client.js', () => ({
  importTransactions: (...args: unknown[]) => mockImportTransactions(...args),
}));

vi.mock('../../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: (...args: unknown[]) => mockResolveAccount(...args),
    resolveCategory: (...args: unknown[]) => mockResolveCategory(...args),
    resolvePayee: (...args: unknown[]) => mockResolvePayee(...args),
  },
}));

function parseJsonContent(response: Awaited<ReturnType<typeof handler>>) {
  const content = response.content[0];
  expect(content?.type).toBe('text');

  if (!content || content.type !== 'text') {
    throw new Error('Expected text content');
  }

  return JSON.parse(content.text);
}

describe('import-transaction-batch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockResolveAccount.mockImplementation(async (account: string) => {
      if (account === 'Checking') return 'acc-checking';
      if (account === 'Savings') return 'acc-savings';
      throw new Error(`Account '${account}' not found`);
    });
    mockResolvePayee.mockImplementation(async (payee: string) => `payee:${payee}`);
    mockResolveCategory.mockImplementation(async (category: string) => `category:${category}`);
  });

  it('imports a valid batch across multiple account groups', async () => {
    mockImportTransactions.mockImplementation(async (accountId: string) => {
      if (accountId === 'acc-checking') {
        return { added: ['txn-1'], updated: [] };
      }

      return { added: [], updated: ['txn-2'] };
    });

    const response = await handler({
      transactions: [
        {
          accountId: 'Checking',
          date: '2026-04-01',
          amount: -1250,
          payee: 'Coffee Shop',
        },
        {
          accountId: 'Savings',
          date: '2026-04-02',
          amount: 5000,
          subtransactions: [{ amount: 5000, category: 'Income' }],
        },
      ],
    });

    const payload = parseJsonContent(response);

    expect(payload).toMatchObject({
      dryRun: false,
      summary: {
        requestedTransactions: 2,
        preparedTransactions: 2,
        addedTransactions: 1,
        updatedTransactions: 1,
        failedTransactions: 0,
        affectedAccounts: 2,
      },
    });
    expect(payload.accounts).toEqual([
      {
        accountId: 'acc-checking',
        accountReferences: ['Checking'],
        requested: 1,
        prepared: 1,
        added: 1,
        updated: 0,
        failed: 0,
        errors: [],
      },
      {
        accountId: 'acc-savings',
        accountReferences: ['Savings'],
        requested: 1,
        prepared: 1,
        added: 0,
        updated: 1,
        failed: 0,
        errors: [],
      },
    ]);
    expect(mockImportTransactions).toHaveBeenNthCalledWith(
      1,
      'acc-checking',
      [
        expect.objectContaining({
          amount: -1250,
          payee: 'payee:Coffee Shop',
        }),
      ],
      {},
    );
    expect(mockImportTransactions).toHaveBeenNthCalledWith(
      2,
      'acc-savings',
      [
        expect.objectContaining({
          amount: 5000,
          subtransactions: [{ amount: 5000, category: 'category:Income', notes: undefined }],
        }),
      ],
      {},
    );
  });

  it('keeps an account result row when every transaction fails preparation', async () => {
    mockResolvePayee.mockRejectedValue(new Error('Payee lookup failed'));

    const response = await handler({
      transactions: [
        {
          accountId: 'Checking',
          date: '2026-04-01',
          amount: -1250,
          payee: 'Broken Payee',
        },
      ],
    });

    const payload = parseJsonContent(response);

    expect(payload.summary).toMatchObject({
      requestedTransactions: 1,
      preparedTransactions: 0,
      addedTransactions: 0,
      updatedTransactions: 0,
      failedTransactions: 1,
      affectedAccounts: 1,
    });
    expect(payload.accounts).toEqual([
      {
        accountId: 'acc-checking',
        accountReferences: ['Checking'],
        requested: 1,
        prepared: 0,
        added: 0,
        updated: 0,
        failed: 1,
        errors: ['Payee lookup failed'],
      },
    ]);
    expect(payload.failures).toEqual([
      {
        accountReference: 'Checking',
        transactionIndex: 0,
        error: 'Payee lookup failed',
      },
    ]);
    expect(mockImportTransactions).not.toHaveBeenCalled();
  });

  it('continues when one account import fails after another succeeds', async () => {
    mockImportTransactions.mockImplementation(async (accountId: string) => {
      if (accountId === 'acc-checking') {
        return { added: ['txn-1'], updated: [] };
      }

      throw new Error('Import rejected by Actual');
    });

    const response = await handler({
      transactions: [
        { accountId: 'Checking', date: '2026-04-01', amount: -1000 },
        { accountId: 'Savings', date: '2026-04-02', amount: 2000 },
      ],
    });

    const payload = parseJsonContent(response);

    expect(payload.summary).toMatchObject({
      requestedTransactions: 2,
      preparedTransactions: 2,
      addedTransactions: 1,
      updatedTransactions: 0,
      failedTransactions: 1,
      affectedAccounts: 2,
    });
    expect(payload.accounts).toEqual([
      expect.objectContaining({
        accountId: 'acc-checking',
        added: 1,
        updated: 0,
        failed: 0,
        errors: [],
      }),
      expect.objectContaining({
        accountId: 'acc-savings',
        added: 0,
        updated: 0,
        failed: 1,
        errors: ['Import rejected by Actual'],
      }),
    ]);
  });

  it('passes dryRun into the report and import options through unchanged', async () => {
    mockImportTransactions.mockResolvedValue({ added: [], updated: [] });

    const response = await handler({
      transactions: [{ accountId: 'Checking', date: '2026-04-01', amount: -1000 }],
      dryRun: true,
      defaultCleared: true,
      reimportDeleted: true,
    });

    const payload = parseJsonContent(response);

    expect(payload.dryRun).toBe(true);
    expect(mockImportTransactions).toHaveBeenCalledWith(
      'acc-checking',
      [expect.objectContaining({ amount: -1000 })],
      {
        defaultCleared: true,
        dryRun: true,
        reimportDeleted: true,
      },
    );
  });

  it('returns the same validation-style error response for malformed input', async () => {
    const response = await handler({
      transactions: [{ accountId: 'Checking', date: '04-01-2026', amount: -1000 }],
    });

    const payload = parseJsonContent(response);

    expect(response.isError).toBe(true);
    expect(payload.error).toBe(true);
    expect(payload.message).toContain('Validation error');
    expect(payload.message).toContain('transactions.0.date');
    expect(payload.suggestion).toBe(
      'Verify that each transaction includes a valid accountId, YYYY-MM-DD date, and amount in cents before retrying.',
    );
  });
});
