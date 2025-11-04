import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { CreateCategoryGroupArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  createCategoryGroup: vi.fn<[
    Record<string, unknown>
  ], Promise<string>>(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('create-category-group tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a category group', async () => {
    mockApi.createCategoryGroup.mockResolvedValue('group-42');

    const args: CreateCategoryGroupArgs = {
      name: 'Utilities',
    };

    const response = await handler(args);

    expect(mockApi.createCategoryGroup).toHaveBeenCalledWith({ name: 'Utilities' });
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully created category group group-42');
  });

  it('returns an error when validation fails', async () => {
    const response = await handler({} as unknown as CreateCategoryGroupArgs);

    expect(response.isError).toBe(true);
  });
});
