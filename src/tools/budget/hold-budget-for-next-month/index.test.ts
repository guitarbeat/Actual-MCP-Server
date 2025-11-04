import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { HoldBudgetForNextMonthArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  holdBudgetForNextMonth: vi.fn<[
    string,
    number
  ], Promise<void>>(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('hold-budget-for-next-month tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('holds the budget for the next month', async () => {
    const args: HoldBudgetForNextMonthArgs = {
      month: '2025-02',
      amount: 500,
    };

    const response = await handler(args);

    expect(mockApi.holdBudgetForNextMonth).toHaveBeenCalledWith('2025-02', 500);
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully held budget amount of 500 for next month in 2025-02');
  });

  it('returns an error when validation fails', async () => {
    const response = await handler({} as unknown as HoldBudgetForNextMonthArgs);

    expect(response.isError).toBe(true);
  });
});
