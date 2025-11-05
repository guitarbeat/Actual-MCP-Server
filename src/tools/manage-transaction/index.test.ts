import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './index.js';
import { ManageTransactionInputParser } from './input-parser.js';
import { ManageTransactionDataFetcher } from './data-fetcher.js';
import type { ManageTransactionArgs } from './types.js';

vi.mock('./input-parser.js');
vi.mock('./data-fetcher.js');

describe('manage-transaction handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates transaction with name resolution', async () => {
    const mockParse = vi.fn().mockResolvedValue({
      operation: 'create',
      accountId: 'account-123',
      date: '2025-01-15',
      amount: 5000,
      payeeId: 'payee-123',
      categoryId: 'category-123',
      notes: 'Test transaction',
      cleared: true,
    });

    const mockExecute = vi.fn().mockResolvedValue({
      transactionId: 'transaction-123',
      operation: 'create',
    });

    vi.mocked(ManageTransactionInputParser).mockImplementation(
      () =>
        ({
          parse: mockParse,
        }) as any
    );

    vi.mocked(ManageTransactionDataFetcher).mockImplementation(
      () =>
        ({
          execute: mockExecute,
        }) as any
    );

    const args: ManageTransactionArgs = {
      operation: 'create',
      transaction: {
        account: 'Checking',
        date: '2025-01-15',
        amount: 5000,
        payee: 'Grocery Store',
        category: 'Food',
        notes: 'Test transaction',
        cleared: true,
      },
    };

    const result = await handler(args);

    expect(mockParse).toHaveBeenCalledWith(args);
    expect(mockExecute).toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
  });

  it('updates transaction', async () => {
    const mockParse = vi.fn().mockResolvedValue({
      operation: 'update',
      id: 'transaction-123',
      amount: 6000,
      categoryId: 'category-456',
    });

    const mockExecute = vi.fn().mockResolvedValue({
      transactionId: 'transaction-123',
      operation: 'update',
    });

    vi.mocked(ManageTransactionInputParser).mockImplementation(
      () =>
        ({
          parse: mockParse,
        }) as any
    );

    vi.mocked(ManageTransactionDataFetcher).mockImplementation(
      () =>
        ({
          execute: mockExecute,
        }) as any
    );

    const args: ManageTransactionArgs = {
      operation: 'update',
      id: 'transaction-123',
      transaction: {
        amount: 6000,
        category: 'Dining',
      },
    };

    const result = await handler(args);

    expect(mockParse).toHaveBeenCalledWith(args);
    expect(mockExecute).toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
  });

  it('handles validation errors', async () => {
    const mockParse = vi.fn().mockRejectedValue(new Error('id is required for update operation'));

    vi.mocked(ManageTransactionInputParser).mockImplementation(
      () =>
        ({
          parse: mockParse,
        }) as any
    );

    const args: ManageTransactionArgs = {
      operation: 'update',
      transaction: {
        amount: 6000,
      },
    };

    const result = await handler(args);

    expect(result.isError).toBe(true);
  });
});
