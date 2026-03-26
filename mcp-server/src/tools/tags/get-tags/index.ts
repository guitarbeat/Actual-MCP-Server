import { fetchAllTags } from '../../../core/data/fetch-tags.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { Tag } from '../../../core/types/index.js';

export const schema = {
  name: 'get-tags',
  description:
    'List all tags in Actual Budget, or search for specific tags. Use this when you need tag IDs before creating, updating, or deleting tags.\n\n' +
    'OPTIONAL:\n' +
    '- search: Partial tag label or description to search\n' +
    '- limit: Maximum number of results to return\n\n' +
    'EXAMPLES:\n' +
    '- "Show all tags": {}\n' +
    '- "Find reimbursement tags": {"search": "reimb"}\n' +
    '- "Show the first five tags": {"limit": 5}\n\n' +
    'RETURNS: Tag IDs, labels, colors, and descriptions',
  inputSchema: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Filter tags by case-insensitive partial matches on label or description.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of tags to return after filtering.',
      },
    },
    required: [],
  },
};

export async function handler(
  args: Record<string, unknown>,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (args.search !== undefined && typeof args.search !== 'string') {
      return errorFromCatch('search must be a string');
    }

    if (args.limit !== undefined) {
      if (typeof args.limit !== 'number' || args.limit < 1) {
        return errorFromCatch('limit must be a positive number');
      }
    }

    let tags: Tag[] = await fetchAllTags();

    if (args.search) {
      const search = (args.search as string).toLowerCase();
      tags = tags.filter(
        (tag) =>
          tag.tag.toLowerCase().includes(search) ||
          (tag.description || '').toLowerCase().includes(search),
      );
    }

    if (args.limit !== undefined) {
      tags = tags.slice(0, args.limit as number);
    }

    return successWithJson(
      tags.map((tag) => ({
        id: tag.id,
        tag: tag.tag,
        color: tag.color ?? null,
        description: tag.description ?? null,
      })),
    );
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to retrieve tags',
      suggestion:
        'Use get-tags to list available tags before referencing them in other operations.',
    });
  }
}
