import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { UpdateCategoryGroupArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  updateCategoryGroup: vi.fn(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('update-category-group tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates category group name', async () => {
    const args: UpdateCategoryGroupArgs = {
      id: 'group-30',
      name: 'Essentials',
    };

    const response = await handler(args);

    expect(mockApi.updateCategoryGroup).toHaveBeenCalledWith('group-30', { name: 'Essentials' });
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully updated category group-30');
  });

  it('returns an error for invalid input', async () => {
    const response = await handler({} as unknown as UpdateCategoryGroupArgs);

    expect(response.isError).toBe(true);
  });
});
