// ----------------------------
// RUN IMPORT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { runImport } from '../../../actual-api.js';

export const schema = {
  name: 'run-import',
  description:
    'Import transactions from a file (CSV, OFX, QIF formats). The file must be accessible on the server filesystem.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- filePath: Path to the transaction file on the server\n\n' +
    'OPTIONAL PARAMETERS:\n' +
    '- importType: File format ("csv", "ofx", "qif") - auto-detected if not specified\n\n' +
    'EXAMPLES:\n' +
    '- Import with auto-detection: {"filePath": "/path/to/transactions.csv"}\n' +
    '- Import with explicit format: {"filePath": "/path/to/transactions.ofx", "importType": "ofx"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Importing bank statement files\n' +
    '- Bulk importing historical transactions\n' +
    '- Importing transactions from unsupported banks\n\n' +
    'NOTES:\n' +
    '- File must exist on the server filesystem (not client-side)\n' +
    '- Supported formats: CSV, OFX (Open Financial Exchange), QIF (Quicken Interchange Format)\n' +
    '- Actual will attempt to auto-detect format if importType not specified\n' +
    '- Duplicate transactions may be created if file contains already-imported transactions\n' +
    '- Use absolute paths or paths relative to Actual Budget server working directory\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Upload or place transaction file on server filesystem\n' +
    '2. Use run-import to import transactions from file\n' +
    '3. Use get-transactions to verify imported transactions\n' +
    '4. Use manage-transaction to categorize or update imported transactions\n\n' +
    'SEE ALSO:\n' +
    '- run-bank-sync: Import transactions via bank sync instead of file\n' +
    '- get-transactions: View imported transactions\n' +
    '- manage-transaction: Update or categorize imported transactions\n' +
    '- get-accounts: Find account IDs for imported transactions',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description:
          'Path to the file to import. Must be an absolute or relative path to a valid transaction file on the server filesystem.',
      },
      importType: {
        type: 'string',
        description:
          'Type of import format (e.g., "csv", "ofx", "qif"). Optional - if not provided, Actual will attempt to auto-detect the file format.',
      },
    },
    required: ['filePath'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.filePath || typeof args.filePath !== 'string') {
      return errorFromCatch('filePath is required and must be a string');
    }

    const importType = args.importType && typeof args.importType === 'string' ? args.importType : undefined;

    await runImport(args.filePath as string, importType);

    return successWithJson(`Successfully ran import from ${args.filePath}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
