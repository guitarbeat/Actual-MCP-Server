import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './index.js';
import { createCategory } from '../../../actual-api.js';

vi.mock('../../../actual-api.js', () => ({
  createCategory: vi.fn(),
}));

describe('create-category handler', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates category when provided valid UUID', async () => {
    const createCategoryMock = vi.mocked(createCategory);
    createCategoryMock.mockResolvedValue('abcd1234');

    const result = await handler({ name: 'Groceries', groupId: validUuid });

    expect(createCategory).toHaveBeenCalledWith({ name: 'Groceries', group_id: validUuid });
    expect(result.isError).toBeUndefined();
    expect(result.content?.[0]).toEqual({
      type: 'text',
      text: '"Successfully created category abcd1234"',
    });
  });

  it('returns error when groupId is not a UUID', async () => {
    const result = await handler({ name: 'Groceries', groupId: 'not-a-uuid' });

    expect(createCategory).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: groupId must be a valid UUID' });
  });
});
