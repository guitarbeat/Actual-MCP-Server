import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './index.js';
import { updateCategory } from '../../../actual-api.js';

vi.mock('../../../actual-api.js', () => ({
  updateCategory: vi.fn(),
}));

describe('update-category handler', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const anotherUuid = '223e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('updates category name with valid identifier', async () => {
    const updateCategoryMock = vi.mocked(updateCategory);
    updateCategoryMock.mockResolvedValue(undefined);

    const result = await handler({ id: validUuid, name: 'Updated Name' });

    expect(updateCategory).toHaveBeenCalledWith(validUuid, { name: 'Updated Name' });
    expect(result.isError).toBeUndefined();
  });

  it('updates category group when provided valid UUID', async () => {
    const updateCategoryMock = vi.mocked(updateCategory);
    updateCategoryMock.mockResolvedValue(undefined);

    await handler({ id: validUuid, name: 'Updated Name', groupId: anotherUuid });

    expect(updateCategory).toHaveBeenCalledWith(validUuid, { name: 'Updated Name', group_id: anotherUuid });
  });

  it('returns error when id is not a UUID', async () => {
    const result = await handler({ id: 'not-a-uuid', name: 'Updated Name' });

    expect(updateCategory).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: id must be a valid UUID' });
  });

  it('returns error when groupId is not a UUID', async () => {
    const result = await handler({ id: validUuid, name: 'Updated Name', groupId: 'not-a-uuid' });

    expect(updateCategory).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: groupId must be a valid UUID' });
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
