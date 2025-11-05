import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateTransactionDataFetcher } from './data-fetcher.js';
import api from '@actual-app/api';

vi.mock('@actual-app/api', () => ({
  default: {
    updateTransaction: vi.fn(),
  },
}));

vi.mock('../../actual-api.js', () => ({
  initActualApi: vi.fn(),
}));

describe('UpdateTransactionDataFetcher', () => {
  const fetcher = new UpdateTransactionDataFetcher();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update transaction with all fields', async () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      categoryId: '550e8400-e29b-41d4-a716-446655440001',
      payeeId: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Updated notes',
      amount: 5000,
    };

    const result = await fetcher.updateTransaction(input);

    expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(api.updateTransaction).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', {
      category: '550e8400-e29b-41d4-a716-446655440001',
      payee: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Updated notes',
      amount: 5000,
    });
  });

  it('should update transaction with only some fields', async () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      notes: 'Just notes',
    };

    const result = await fetcher.updateTransaction(input);

    expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(api.updateTransaction).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', {
      notes: 'Just notes',
    });
  });

  it('should handle API errors', async () => {
    vi.mocked(api.updateTransaction).mockRejectedValue(new Error('API error'));

    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      notes: 'Test',
    };

    await expect(fetcher.updateTransaction(input)).rejects.toThrow('API error');
  });
});
