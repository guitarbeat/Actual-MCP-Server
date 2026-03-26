import { zodToJsonSchema } from 'zod-to-json-schema';
import { auditHistoricalTransfers } from '../../../core/analysis/historical-transfer-audit.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { AuditHistoricalTransfersArgsSchema } from '../../../core/types/index.js';

export const schema = {
  name: 'audit-historical-transfers',
  description:
    'Audit already-imported transactions for strict historical transfer candidates, then separate softer payment-style leftovers for manual review.\n\n' +
    'WHEN TO USE:\n' +
    '- You suspect many uncategorized transactions are really transfers or card payments\n' +
    '- You want to preview safe historical transfer pairs before linking them\n' +
    '- You need a transfer-first second audit before more category cleanup\n\n' +
    'STRICT MATCH RULES:\n' +
    '- Different accounts\n' +
    '- Exact inverse amounts\n' +
    '- Dates within 3 days\n' +
    '- Exactly one unique counterpart on each side\n\n' +
    'DEFAULTS:\n' +
    '- startDate omitted: scan all history from 1900-01-01\n' +
    '- endDate omitted: use today\n' +
    '- candidateLimit defaults to 100\n' +
    '- flaggedReviewLimit defaults to 25\n\n' +
    'RETURNS:\n' +
    '- Summary counts and top account-pair hotspots\n' +
    '- Strict candidate pairs with both transaction IDs and category state\n' +
    '- Transfer-like manual-review clusters such as Payment, Bill Payment, or Venmo',
  inputSchema: zodToJsonSchema(AuditHistoricalTransfersArgsSchema) as ToolInput,
};

export async function handler(args: unknown = {}) {
  try {
    const input = AuditHistoricalTransfersArgsSchema.parse(args);
    const result = await auditHistoricalTransfers(input);
    return successWithJson(result);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to audit historical transfers',
      suggestion:
        'Check the date range and retry. Omit dates to scan the full transaction history for strict transfer candidates.',
    });
  }
}
