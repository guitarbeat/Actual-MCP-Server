import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleTagsResource } from './tag-resources.js';

const mockFetchAllTags = vi.fn();

vi.mock('../core/data/fetch-tags.js', () => ({
  fetchAllTags: (...args: unknown[]) => mockFetchAllTags(...args),
}));

function getTextContent(result: Awaited<ReturnType<typeof handleTagsResource>>): string {
  const firstContent = result.contents[0];

  if (!('text' in firstContent)) {
    throw new Error('Expected a text resource');
  }

  return firstContent.text;
}

describe('handleTagsResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a markdown table of tags', async () => {
    mockFetchAllTags.mockResolvedValue([
      {
        id: 'tag-1',
        tag: 'reimbursable',
        color: '#ff0000',
        description: 'Expense to reimburse',
      },
    ]);

    const result = await handleTagsResource('actual://tags');
    const text = getTextContent(result);

    expect(text).toContain('# Actual Budget Tags');
    expect(text).toContain('| ID | Tag | Color | Description |');
    expect(text).toContain('| tag-1 | reimbursable | #ff0000 | Expense to reimburse |');
  });

  it('shows an empty state when no tags exist', async () => {
    mockFetchAllTags.mockResolvedValue([]);

    const result = await handleTagsResource('actual://tags');
    const text = getTextContent(result);

    expect(text).toContain('_No tags found._');
  });
});
