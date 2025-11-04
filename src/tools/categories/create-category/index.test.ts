import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { CreateCategoryArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  createCategory: vi.fn<[
    Record<string, unknown>
  ], Promise<string>>(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('create-category tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a category with mapped fields', async () => {
    mockApi.createCategory.mockResolvedValue('cat-1');

    const args: CreateCategoryArgs = {
      name: 'Dining Out',
      groupId: 'group-1',
    };

    const response = await handler(args);

    expect(mockApi.createCategory).toHaveBeenCalledWith({
      name: 'Dining Out',
      group_id: 'group-1',
    });

    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully created category cat-1');
  });

  it('returns an error for invalid input', async () => {
    const response = await handler({} as unknown as CreateCategoryArgs);

    expect(response.isError).toBe(true);
  });
});
