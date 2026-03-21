import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionHandler } from './transaction-handler.js';

const mockAddTransactions = vi.fn();
const mockDeleteTransaction = vi.fn();
const mockGetTransactions = vi.fn();
const mockImportTransactions = vi.fn();
const mockUpdateTransaction = vi.fn();
const mockFetchAllPayees = vi.fn();
const mockResolveAccount = vi.fn();
const mockResolveCategory = vi.fn();
const mockResolvePayee = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  addTransactions: (...args: unknown[]) => mockAddTransactions(...args),
  deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
  getTransactions: (...args: unknown[]) => mockGetTransactions(...args),
  importTransactions: (...args: unknown[]) => mockImportTransactions(...args),
  updateTransaction: (...args: unknown[]) => mockUpdateTransaction(...args),
}));

vi.mock('../../../core/cache/cache-service.js', () => ({
  cacheService: {
    invalidatePattern: vi.fn(),
    invalidate: vi.fn(),
  },
}));

vi.mock('../../../core/data/fetch-payees.js', () => ({
  fetchAllPayees: () => mockFetchAllPayees(),
}));

vi.mock('../../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: (...args: unknown[]) => mockResolveAccount(...args),
    resolveCategory: (...args: unknown[]) => mockResolveCategory(...args),
    resolvePayee: (...args: unknown[]) => mockResolvePayee(...args),
  },
}));

describe('TransactionHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    mockResolveAccount.mockImplementation(async (value: string) =>
      value === 'Checking' ? 'account-checking' : 'account-savings',
    );
    mockResolveCategory.mockResolvedValue('category-groceries');
    mockResolvePayee.mockResolvedValue('payee-merchant');
    mockFetchAllPayees.mockResolvedValue([
      { id: 'payee-transfer', name: 'Transfer: Savings', transfer_acct: 'account-savings' },
    ]);
  });

  it('creates transfer transactions with runTransfers enabled', async () => {
    mockAddTransactions.mockResolvedValue(undefined);
    mockGetTransactions.mockResolvedValue([
      {
        id: 'transfer-1',
        imported_id: 'manual-account-checking-2025-01-15--20000-1700000000000',
      },
    ]);

    const handler = new TransactionHandler();
    const transactionId = await handler.create({
      account: 'Checking',
      date: '2025-01-15',
      amount: -200,
      transferAccount: 'Savings',
      notes: 'Move cash',
    });

    expect(transactionId).toBe('transfer-1');
    expect(mockAddTransactions).toHaveBeenCalledWith(
      'account-checking',
      [
        {
          date: '2025-01-15',
          amount: -20000,
          payee: 'payee-transfer',
          notes: 'Move cash',
          cleared: false,
          imported_id: 'manual-account-checking-2025-01-15--20000-1700000000000',
        },
      ],
      { runTransfers: true },
    );
    expect(mockGetTransactions).toHaveBeenCalledWith(
      'account-checking',
      '2025-01-15',
      '2025-01-15',
    );
    expect(mockImportTransactions).not.toHaveBeenCalled();
  });

  it('preserves standard transaction imports when transferAccount is omitted', async () => {
    mockImportTransactions.mockResolvedValue({ added: ['transaction-1'], updated: [] });

    const handler = new TransactionHandler();
    const transactionId = await handler.create({
      account: 'Checking',
      date: '2025-01-20',
      amount: -45.67,
      payee: 'Whole Foods',
      category: 'Groceries',
      notes: 'Groceries',
    });

    expect(transactionId).toBe('transaction-1');
    expect(mockImportTransactions).toHaveBeenCalledWith('account-checking', [
      expect.objectContaining({
        amount: -4567,
        payee: 'payee-merchant',
        category: 'category-groceries',
        notes: 'Groceries',
      }),
    ]);
    expect(mockAddTransactions).not.toHaveBeenCalled();
  });

  it('derives a stable imported_id from idempotencyKey', async () => {
    mockImportTransactions.mockResolvedValue({ added: ['transaction-2'], updated: [] });

    const handler = new TransactionHandler();
    await handler.create({
      account: 'Checking',
      date: '2025-01-20',
      amount: -45.67,
      payee: 'Whole Foods',
      category: 'Groceries',
      idempotencyKey: 'retry-safe-key',
    });

    expect(mockImportTransactions).toHaveBeenCalledWith('account-checking', [
      expect.objectContaining({
        imported_id: 'manual-3901c58bb6826f2a838df0f5',
      }),
    ]);
  });

  it('rejects transfer transactions that also provide a category', async () => {
    const handler = new TransactionHandler();

    await expect(
      handler.create({
        account: 'Checking',
        date: '2025-01-15',
        amount: -200,
        transferAccount: 'Savings',
        category: 'Groceries',
      }),
    ).rejects.toThrow('category cannot be set when transferAccount is provided');
  });
});
