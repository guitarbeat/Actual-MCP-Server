import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { DeleteCategoryGroupArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  deleteCategoryGroup: vi.fn<[
    string
  ], Promise<void>>(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('delete-category-group tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the requested category group', async () => {
    const args: DeleteCategoryGroupArgs = {
      id: 'group-77',
    };

    const response = await handler(args);

    expect(mockApi.deleteCategoryGroup).toHaveBeenCalledWith('group-77');
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully deleted category group group-77');
  });

  it('returns an error when id is invalid', async () => {
    const response = await handler({} as unknown as DeleteCategoryGroupArgs);

    expect(response.isError).toBe(true);
  });
});
