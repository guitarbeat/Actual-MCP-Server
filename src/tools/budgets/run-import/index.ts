// ----------------------------
// RUN IMPORT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { runImport } from '../../../actual-api.js';

export const schema = {
  name: 'run-import',
  description: 'Run an import from a file',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to import',
      },
      importType: {
        type: 'string',
        description: 'Type of import (e.g., "csv", "ofx", "qif")',
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
