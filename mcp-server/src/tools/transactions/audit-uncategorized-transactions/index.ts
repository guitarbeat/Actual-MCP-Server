import { zodToJsonSchema } from 'zod-to-json-schema';
import { auditUncategorizedTransactions } from '../../../core/analysis/uncategorized-audit.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { AuditUncategorizedTransactionsArgsSchema } from '../../../core/types/index.js';

export const schema = {
  name: 'audit-uncategorized-transactions',
  description:
    'Audit uncategorized transactions at scale and group them into rule opportunities versus manual cleanup work.\n\n' +
    'WHEN TO USE:\n' +
    '- You have many uncategorized transactions to triage\n' +
    '- You want to find high-confidence rule opportunities before fixing leftovers manually\n' +
    '- You need grouped audit output instead of a raw transaction dump\n\n' +
    'DEFAULTS:\n' +
    '- accountId omitted: scan all on-budget accounts\n' +
    '- startDate omitted: scan all history from 1900-01-01\n' +
    '- endDate omitted: use today\n' +
    '- excludeTransfers defaults to true\n' +
    '- groupLimit defaults to 25 groups\n' +
    '- samplePerGroup defaults to 5 transactions\n\n' +
    'RETURNS:\n' +
    '- Summary totals for uncategorized backlog size\n' +
    '- Grouped clusters by imported payee or payee, split per account\n' +
    '- Historical category hints when peer history is strong enough\n' +
    '- Related rules plus create-rule or update-rule suggestions\n' +
    '- Manual-review groups for ambiguous leftovers',
  inputSchema: zodToJsonSchema(AuditUncategorizedTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: unknown = {}) {
  try {
    const input = AuditUncategorizedTransactionsArgsSchema.parse(args);
    const result = await auditUncategorizedTransactions(input);
    return successWithJson(result);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to audit uncategorized transactions',
      suggestion:
        'Check the account name or date range, then retry. Omit dates to scan the full transaction history.',
    });
  }
}
