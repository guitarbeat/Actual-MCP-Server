import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { fetchAllTags } from '../core/data/fetch-tags.js';

export const TAG_LIST_RESOURCES = [
  {
    uri: 'actual://tags',
    name: 'Tag Directory',
    description: 'Browse all tags available in Actual Budget.',
    mimeType: 'text/markdown',
  },
];

export async function handleTagsResource(uri: string): Promise<ReadResourceResult> {
  const tags = await fetchAllTags();

  if (tags.length === 0) {
    return {
      contents: [
        {
          uri,
          text: '# Actual Budget Tags\n\n_No tags found._',
          mimeType: 'text/markdown',
        },
      ],
    };
  }

  const rows = tags
    .map((tag) => `| ${tag.id} | ${tag.tag} | ${tag.color ?? ''} | ${tag.description ?? ''} |`)
    .join('\n');

  return {
    contents: [
      {
        uri,
        text:
          '# Actual Budget Tags\n\n' +
          '| ID | Tag | Color | Description |\n' +
          '|----|-----|-------|-------------|\n' +
          `${rows}`,
        mimeType: 'text/markdown',
      },
    ],
  };
}
