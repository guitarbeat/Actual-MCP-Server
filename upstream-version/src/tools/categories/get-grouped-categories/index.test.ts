import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockData = vi.hoisted(() => ({
  fetchAllCategoryGroups: vi.fn(),
}));

vi.mock('../../../core/data/fetch-categories.js', () => mockData);

describe('get-grouped-categories tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fetched category groups', async () => {
    mockData.fetchAllCategoryGroups.mockResolvedValue([
      { id: 'group-1', name: 'Essentials', categories: [], is_income: false },
    ]);

    const response = await handler();

    expect(mockData.fetchAllCategoryGroups).toHaveBeenCalled();
    expect(response.isError).toBeUndefined();
  });

  it('rejects unexpected arguments', async () => {
    const response = await handler({} as any);

    expect(response.isError).toBeUndefined();

    const invalid = await handler({ unexpected: true } as any);
    expect(invalid.isError).toBe(true);
  });
});
