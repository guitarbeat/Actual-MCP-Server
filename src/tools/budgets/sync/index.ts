// ----------------------------
// SYNC TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { sync } from '../../../actual-api.js';

export const schema = {
  name: 'sync',
  description: 'Sync the budget with the server',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handler(
  _args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    await sync();

    return successWithJson('Successfully synced with server');
  } catch (err) {
    return errorFromCatch(err);
  }
}
