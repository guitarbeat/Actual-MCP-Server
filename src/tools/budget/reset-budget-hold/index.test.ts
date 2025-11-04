import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { ResetBudgetHoldArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  resetBudgetHold: vi.fn<[
    string
  ], Promise<void>>(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('reset-budget-hold tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets the hold for a month', async () => {
    const args: ResetBudgetHoldArgs = {
      month: '2025-01',
    };

    const response = await handler(args);

    expect(mockApi.resetBudgetHold).toHaveBeenCalledWith('2025-01');
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully reset budget hold for month 2025-01');
  });

  it('returns an error when month is invalid', async () => {
    const response = await handler({} as unknown as ResetBudgetHoldArgs);

    expect(response.isError).toBe(true);
  });
});
