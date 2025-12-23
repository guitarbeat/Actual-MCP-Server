import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockApi = vi.hoisted(() => ({
  resetBudgetHold: vi.fn(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('reset-budget-hold tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset budget hold for month', async () => {
    mockApi.resetBudgetHold.mockResolvedValue(undefined);

    const response = await handler({
      month: '2024-01',
    });

    expect(mockApi.resetBudgetHold).toHaveBeenCalledWith('2024-01');
    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toContain('Successfully reset budget hold');
    expect(data).toContain('2024-01');
  });

  it('should return error when month is missing', async () => {
    // @ts-expect-error - testing missing month
    const response = await handler({});

    expect(response.isError).toBe(true);
    expect(mockApi.resetBudgetHold).not.toHaveBeenCalled();
  });

  it('should return error when month format is invalid', async () => {
    const response = await handler({
      month: '2024/01',
    });

    expect(response.isError).toBe(true);
    expect(mockApi.resetBudgetHold).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockApi.resetBudgetHold.mockRejectedValue(new Error('API error'));

    const response = await handler({
      month: '2024-01',
    });

    expect(response.isError).toBe(true);
  });
});
