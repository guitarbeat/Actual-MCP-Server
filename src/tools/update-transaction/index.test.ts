import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '@actual-app/api';
import { handler } from './index.js';
import { initActualApi } from '../../actual-api.js';

vi.mock('../../actual-api.js', () => ({
  initActualApi: vi.fn(),
}));

vi.mock('@actual-app/api', () => ({
  default: {
    updateTransaction: vi.fn(),
  },
}));

describe('update-transaction handler', () => {
  const validTransactionId = '123e4567-e89b-12d3-a456-426614174000';
  const validCategoryId = '223e4567-e89b-12d3-a456-426614174000';
  const validPayeeId = '323e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('updates transaction with validated inputs', async () => {
    const updateTransactionMock = vi.mocked(api.updateTransaction);
    updateTransactionMock.mockResolvedValue(undefined);
    const initMock = vi.mocked(initActualApi);
    initMock.mockResolvedValue(undefined);

    const result = await handler({
      transactionId: validTransactionId,
      categoryId: validCategoryId,
      payeeId: validPayeeId,
      notes: 'Updated note',
      amount: 5000,
    });

    expect(initActualApi).toHaveBeenCalled();
    expect(api.updateTransaction).toHaveBeenCalledWith(validTransactionId, {
      category: validCategoryId,
      payee: validPayeeId,
      notes: 'Updated note',
      amount: 5000,
    });
    expect(result.isError).toBeUndefined();
  });

  it('rejects invalid transactionId', async () => {
    const result = await handler({ transactionId: 'not-a-uuid', amount: 5000 });

    expect(api.updateTransaction).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: transactionId must be a valid UUID' });
  });

  it('rejects invalid amount', async () => {
    const result = await handler({ transactionId: validTransactionId, amount: 10.5 });

    expect(api.updateTransaction).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: amount must be a positive integer amount in cents' });
  });

  it('rejects invalid optional identifiers', async () => {
    const result = await handler({
      transactionId: validTransactionId,
      categoryId: 'not-a-uuid',
    });

    expect(api.updateTransaction).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: categoryId must be a valid UUID' });
  });
});
