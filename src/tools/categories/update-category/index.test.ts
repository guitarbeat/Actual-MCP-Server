import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

const mockApi = vi.hoisted(() => ({
  updateCategory: vi.fn(),
}));

vi.mock('../../../actual-api.js', async () => mockApi);

describe('update-category tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: updates category with mapped fields', async () => {
    mockApi.updateCategory.mockResolvedValue(undefined);

    const res = await handler({
      id: 'cat-1',
      name: 'Groceries',
      groupId: 'group-1',
    });

    expect(mockApi.updateCategory).toHaveBeenCalledWith('cat-1', {
      name: 'Groceries',
      group_id: 'group-1',
    });

    const text = (res.content?.[0] as any).text as string;
    expect(text).toContain('Successfully updated category cat-1');
  });

  it('failure: rejects unexpected parameters', async () => {
    const res = await handler({
      id: 'cat-1',
      name: 'Groceries',
      foo: 'bar',
    });

    expect(res.isError).toBe(true);
    expect(mockApi.updateCategory).not.toHaveBeenCalled();

    const text = (res.content?.[0] as any).text as string;
    expect(text).toContain('Invalid parameter(s): foo');
    expect(text).toContain('Try calling update-category');
  });
});
