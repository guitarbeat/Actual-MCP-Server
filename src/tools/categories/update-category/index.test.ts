import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { UpdateCategoryArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  updateCategory: vi.fn<[
    string,
    Record<string, unknown>
  ], Promise<void>>(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('update-category tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates category fields', async () => {
    const args: UpdateCategoryArgs = {
      id: 'cat-12',
      name: 'Updated Name',
      groupId: 'group-5',
    };

    const response = await handler(args);

    expect(mockApi.updateCategory).toHaveBeenCalledWith('cat-12', {
      name: 'Updated Name',
      group_id: 'group-5',
    });

    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully updated category cat-12');
  });

  it('omits optional fields when not provided', async () => {
    const args: UpdateCategoryArgs = {
      id: 'cat-12',
      name: 'Updated Name',
    };

    await handler(args);

    expect(mockApi.updateCategory).toHaveBeenCalledWith('cat-12', {
      name: 'Updated Name',
    });
  });

  it('returns an error when validation fails', async () => {
    const response = await handler({} as unknown as UpdateCategoryArgs);

    expect(response.isError).toBe(true);
  });
});
