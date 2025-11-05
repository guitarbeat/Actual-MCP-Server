import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '@actual-app/api';
import { TextContent } from '@modelcontextprotocol/sdk/types.js';
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
    updateTransactionMock.mockResolvedValue([] as any);
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
    const textContent = result.content?.[0] as TextContent;
    const errorContent = JSON.parse(textContent.text);
    expect(errorContent.error).toBe(true);
    expect(errorContent.message).toContain('transactionId must be a valid UUID');
  });

  it('rejects invalid amount', async () => {
    const result = await handler({ transactionId: validTransactionId, amount: 10.5 });

    expect(api.updateTransaction).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    const textContent = result.content?.[0] as TextContent;
    const errorContent = JSON.parse(textContent.text);
    expect(errorContent.error).toBe(true);
    expect(errorContent.message).toContain('amount must be a positive integer amount in cents');
  });

  it('rejects invalid optional identifiers', async () => {
    const result = await handler({
      transactionId: validTransactionId,
      categoryId: 'not-a-uuid',
    });

    expect(api.updateTransaction).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    const textContent = result.content?.[0] as TextContent;
    const errorContent = JSON.parse(textContent.text);
    expect(errorContent.error).toBe(true);
    expect(errorContent.message).toContain('categoryId must be a valid UUID');
  });
});
