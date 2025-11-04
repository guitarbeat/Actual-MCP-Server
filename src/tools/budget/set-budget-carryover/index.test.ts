import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { SetBudgetCarryoverArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  setBudgetCarryover: vi.fn(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('set-budget-carryover tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles carryover flag', async () => {
    const args: SetBudgetCarryoverArgs = {
      month: '2025-04',
      categoryId: 'cat-40',
      enabled: true,
    };

    const response = await handler(args);

    expect(mockApi.setBudgetCarryover).toHaveBeenCalledWith('2025-04', 'cat-40', true);
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully enabled budget carryover for category cat-40 in month 2025-04');
  });

  it('returns an error for invalid input', async () => {
    const response = await handler({} as unknown as SetBudgetCarryoverArgs);

    expect(response.isError).toBe(true);
  });
});
