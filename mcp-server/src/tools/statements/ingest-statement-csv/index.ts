// Simple tool to ingest a recent bank/credit statement CSV export
// so timeline-recon and other cleanup can use fresh statement descriptions + amounts.
// User can paste CSV content (or path for local runs). Keeps it API-simple.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { errorFromCatch, successWithJson, validationError } from '../../../core/response/index.js';
import { resolveLocalReconciliationPath } from '../../../core/analysis/local-reconciliation-workspace.js';

export const schema = {
  name: 'ingest-statement-csv',
  description:
    'Ingest a recent bank or credit card statement export (CSV text) for use in reconciliation and timeline-based cleanup.\n\n' +
    'WHEN TO USE:\n' +
    '- User provides latest statement CSV after export from their bank\n' +
    '- To refresh supplemental data so recent imports get accurate descriptions/payees/dates for matching\n\n' +
    'REQUIRED:\n' +
    '- csvContent: the full CSV text (header row + transactions). Typical columns: Date, Description, Amount, Account, "Statement description" (optional)\n\n' +
    'OPTIONAL:\n' +
    '- filename: custom name for the saved file (defaults to timestamped *transactions.csv)\n\n' +
    'NOTES:\n' +
    '- File is written to .local-reconciliation/timeline/ (gitignored)\n' +
    '- Subsequent timeline-audit/apply or recon tools will pick the most recent by default\n' +
    '- Simple direct tool modeled after raw API usage; no heavy processing here',
  inputSchema: {
    type: 'object',
    properties: {
      csvContent: {
        type: 'string',
        description: 'CSV content of the bank/statement export',
      },
      filename: {
        type: 'string',
        description: 'Optional filename to use inside the timeline recon dir',
      },
    },
    required: ['csvContent'],
  },
};

export async function handler(
  args: Record<string, unknown>,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const csvContent = (args.csvContent as string) || '';
    if (!csvContent || csvContent.trim().length < 20) {
      return validationError('csvContent is required and must contain CSV rows', {
        field: 'csvContent',
      });
    }

    const filename =
      (args.filename as string) ||
      `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}-transactions.csv`;
    const reconDir = resolveLocalReconciliationPath('timeline');
    const targetPath = resolve(reconDir, filename);

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, csvContent, 'utf8');

    return successWithJson({
      savedPath: targetPath,
      filename,
      bytes: Buffer.byteLength(csvContent, 'utf8'),
      message:
        'Statement CSV ingested. Use timeline tools or reconcile with fresh data. (For remote MCP, re-run recon after ingest.)',
    });
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to ingest statement CSV',
      suggestion:
        'Ensure csvContent is valid text and the local .local-reconciliation dir is writable.',
    });
  }
}
