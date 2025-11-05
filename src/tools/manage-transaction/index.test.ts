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

  it('deletes transaction with valid ID', async () => {
    const mockParse = vi.fn().mockResolvedValue({
      operation: 'delete',
      id: 'transaction-123',
    });

    const mockExecute = vi.fn().mockResolvedValue({
      transactionId: 'transaction-123',
      operation: 'delete',
      details: {
        date: '2025-01-15',
        amount: -5000,
        payee: 'Grocery Store',
        account: 'Checking',
      },
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
      operation: 'delete',
      id: 'transaction-123',
    };

    const result = await handler(args);

    expect(mockParse).toHaveBeenCalledWith(args);
    expect(mockExecute).toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('✓ Deleted transaction transaction-123');
    expect(result.content[0].text).toContain('⚠️  This operation cannot be undone');
  });

  it('handles delete operation with non-existent transaction ID', async () => {
    const mockParse = vi.fn().mockResolvedValue({
      operation: 'delete',
      id: 'non-existent-id',
    });

    const mockExecute = vi.fn().mockRejectedValue(new Error('Transaction not found'));

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
      operation: 'delete',
      id: 'non-existent-id',
    };

    const result = await handler(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Transaction not found');
  });

  it('handles delete operation without ID', async () => {
    const mockParse = vi.fn().mockRejectedValue(new Error('Transaction ID is required for delete operation'));

    vi.mocked(ManageTransactionInputParser).mockImplementation(
      () =>
        ({
          parse: mockParse,
        }) as any
    );

    const args: ManageTransactionArgs = {
      operation: 'delete',
    };

    const result = await handler(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Transaction ID is required for delete operation');
  });

  it('does not break create operation after adding delete', async () => {
    const mockParse = vi.fn().mockResolvedValue({
      operation: 'create',
      accountId: 'account-123',
      date: '2025-01-15',
      amount: 5000,
    });

    const mockExecute = vi.fn().mockResolvedValue({
      transactionId: 'transaction-456',
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
      },
    };

    const result = await handler(args);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('✓ Transaction created successfully');
  });

  it('does not break update operation after adding delete', async () => {
    const mockParse = vi.fn().mockResolvedValue({
      operation: 'update',
      id: 'transaction-789',
      amount: 7000,
    });

    const mockExecute = vi.fn().mockResolvedValue({
      transactionId: 'transaction-789',
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
      id: 'transaction-789',
      transaction: {
        amount: 7000,
      },
    };

    const result = await handler(args);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('✓ Transaction updated successfully');
  });
});
