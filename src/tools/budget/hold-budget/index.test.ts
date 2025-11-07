import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockApi = vi.hoisted(() => ({
  holdBudgetForNextMonth: vi.fn(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('hold-budget tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hold budget amount for next month', async () => {
    mockApi.holdBudgetForNextMonth.mockResolvedValue(undefined);

    const response = await handler({
      month: '2024-01',
      amount: 50000,
    });

    expect(mockApi.holdBudgetForNextMonth).toHaveBeenCalledWith('2024-01', 50000);
    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toContain('Successfully held budget amount');
    expect(data).toContain('50000');
    expect(data).toContain('2024-01');
  });

  it('should return error when amount is missing', async () => {
    const response = await handler({
      month: '2024-01',
    });

    expect(response.isError).toBe(true);
    expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
  });

  it('should return error when amount is not a positive integer', async () => {
    const response = await handler({
      month: '2024-01',
      amount: -50000,
    });

    expect(response.isError).toBe(true);
    expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
  });

  it('should return error when month format is invalid', async () => {
    const response = await handler({
      month: '2024/01',
      amount: 50000,
    });

    expect(response.isError).toBe(true);
    expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockApi.holdBudgetForNextMonth.mockRejectedValue(new Error('API error'));

    const response = await handler({
      month: '2024-01',
      amount: 50000,
    });

    expect(response.isError).toBe(true);
  });
});
