import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { DeleteCategoryArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  deleteCategory: vi.fn<[
    string
  ], Promise<void>>(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('delete-category tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the requested category', async () => {
    const args: DeleteCategoryArgs = {
      id: 'cat-9',
    };

    const response = await handler(args);

    expect(mockApi.deleteCategory).toHaveBeenCalledWith('cat-9');
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully deleted category cat-9');
  });

  it('returns an error when id is invalid', async () => {
    const response = await handler({} as unknown as DeleteCategoryArgs);

    expect(response.isError).toBe(true);
  });
});
