import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { SetBudgetAmountArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  setBudgetAmount: vi.fn(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('set-budget-amount tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the budgeted amount', async () => {
    const args: SetBudgetAmountArgs = {
      month: '2025-03',
      categoryId: 'cat-33',
      amount: 900,
    };

    const response = await handler(args);

    expect(mockApi.setBudgetAmount).toHaveBeenCalledWith('2025-03', 'cat-33', 900);
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully set budget amount of 900 for category cat-33 in month 2025-03');
  });

  it('returns an error for invalid input', async () => {
    const response = await handler({} as unknown as SetBudgetAmountArgs);

    expect(response.isError).toBe(true);
  });
});
