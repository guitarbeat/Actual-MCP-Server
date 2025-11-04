import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './index.js';
import { setBudgetAmount } from '../../../actual-api.js';

vi.mock('../../../actual-api.js', () => ({
  setBudgetAmount: vi.fn(),
}));

describe('set-budget-amount handler', () => {
  const validMonth = '2024-01';
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls API with validated inputs', async () => {
    const setBudgetAmountMock = vi.mocked(setBudgetAmount);
    setBudgetAmountMock.mockResolvedValue(undefined);

    const result = await handler({ month: validMonth, categoryId: validUuid, amount: 12345 });

    expect(setBudgetAmount).toHaveBeenCalledWith(validMonth, validUuid, 12345);
    expect(result.isError).toBeUndefined();
    expect(result.content?.[0]).toEqual({
      type: 'text',
      text: '"Successfully set budget amount of 12345 for category 123e4567-e89b-12d3-a456-426614174000 in month 2024-01"',
    });
  });

  it('rejects invalid month formats', async () => {
    const result = await handler({ month: '01-2024', categoryId: validUuid, amount: 12345 });

    expect(setBudgetAmount).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: month must be in YYYY-MM format' });
  });

  it('rejects invalid category identifiers', async () => {
    const result = await handler({ month: validMonth, categoryId: 'not-a-uuid', amount: 12345 });

    expect(setBudgetAmount).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: categoryId must be a valid UUID' });
  });

  it('rejects negative amounts', async () => {
    const result = await handler({ month: validMonth, categoryId: validUuid, amount: -50 });

    expect(setBudgetAmount).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: amount must be a positive integer amount in cents' });
  });

  it('rejects non-integer amounts', async () => {
    const result = await handler({ month: validMonth, categoryId: validUuid, amount: 10.5 });

    expect(setBudgetAmount).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: amount must be a positive integer amount in cents' });
  });
});
