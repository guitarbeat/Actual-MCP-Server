import { zodToJsonSchema } from 'zod-to-json-schema';
import { applyHistoricalTransfers } from '../../../core/api/actual-client.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { ApplyHistoricalTransfersArgsSchema } from '../../../core/types/index.js';

export const schema = {
  name: 'apply-historical-transfers',
  description:
    'Link strict historical transfer candidates as real transfers without creating duplicate counterpart transactions.\n\n' +
    'WHEN TO USE:\n' +
    '- You already ran audit-historical-transfers\n' +
    '- You want to apply only explicit candidate IDs returned by that audit\n' +
    '- You need to convert already-imported transaction pairs into true linked transfers\n\n' +
    'SAFETY CHECKS:\n' +
    '- Revalidates exact inverse amount, different accounts, and <= 3 day spacing\n' +
    '- Rejects split, starting-balance, already-linked, or no-longer-unique pairs\n' +
    '- Uses Actual local data access so it can link existing rows without creating duplicates\n\n' +
    'INPUT:\n' +
    '- candidateIds: Array of candidate IDs returned by audit-historical-transfers',
  inputSchema: zodToJsonSchema(ApplyHistoricalTransfersArgsSchema) as ToolInput,
};

export async function handler(args: unknown = {}) {
  try {
    const input = ApplyHistoricalTransfersArgsSchema.parse(args);
    const result = await applyHistoricalTransfers(input.candidateIds);
    return successWithJson(result);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to apply historical transfers',
      suggestion:
        'Run audit-historical-transfers first, then retry with candidate IDs returned by that audit.',
    });
  }
}
