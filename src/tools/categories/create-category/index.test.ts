import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

const mockApi = vi.hoisted(() => ({
  createCategory: vi.fn(),
}));

vi.mock('../../../actual-api.js', async () => mockApi);

describe('create-category tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: creates category with mapped fields', async () => {
    mockApi.createCategory.mockResolvedValue('cat_123');

    const res = await handler({
      name: 'Groceries',
      groupId: 'group-1',
    });

    expect(mockApi.createCategory).toHaveBeenCalledWith({
      name: 'Groceries',
      group_id: 'group-1',
    });

    const text = (res.content?.[0] as any).text as string;
    expect(text).toContain('Successfully created category cat_123');
  });

  it('failure: rejects unexpected parameters', async () => {
    const res = await handler({
      name: 'Groceries',
      groupId: 'group-1',
      group_id: 'not-allowed',
    });

    expect(res.isError).toBe(true);
    expect(mockApi.createCategory).not.toHaveBeenCalled();

    const text = (res.content?.[0] as any).text as string;
    expect(text).toContain('Invalid parameter(s): group_id');
    expect(text).toContain('Try calling create-category');
  });
});
