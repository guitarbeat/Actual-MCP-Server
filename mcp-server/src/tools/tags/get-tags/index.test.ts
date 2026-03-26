import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockFetchAllTags = vi.fn();

vi.mock('../../../core/data/fetch-tags.js', () => ({
  fetchAllTags: (...args: unknown[]) => mockFetchAllTags(...args),
}));

function parsePayload(result: Awaited<ReturnType<typeof handler>>) {
  const firstContent = result.content[0];
  if (firstContent.type !== 'text') {
    throw new Error('Expected text content');
  }

  return JSON.parse(firstContent.text);
}

describe('get-tags handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAllTags.mockResolvedValue([
      {
        id: 'tag-1',
        tag: 'reimbursable',
        color: '#ff0000',
        description: 'Expense to reimburse',
      },
      {
        id: 'tag-2',
        tag: 'taxes',
        color: null,
        description: 'Tax related',
      },
    ]);
  });

  it('returns tags from the data layer', async () => {
    const result = await handler({});
    const payload = parsePayload(result);

    expect(payload).toEqual([
      {
        id: 'tag-1',
        tag: 'reimbursable',
        color: '#ff0000',
        description: 'Expense to reimburse',
      },
      {
        id: 'tag-2',
        tag: 'taxes',
        color: null,
        description: 'Tax related',
      },
    ]);
  });

  it('filters tags by a search term', async () => {
    const result = await handler({ search: 'tax' });
    const payload = parsePayload(result);

    expect(payload).toEqual([
      {
        id: 'tag-2',
        tag: 'taxes',
        color: null,
        description: 'Tax related',
      },
    ]);
  });
});
