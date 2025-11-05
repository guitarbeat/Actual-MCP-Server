// ----------------------------
// GET SERVER VERSION TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { getServerVersion } from '../../../actual-api.js';

export const schema = {
  name: 'get-server-version',
  description: 'Get the version of the Actual Budget server',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handler(
  _args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const version = await getServerVersion();

    return successWithJson(version);
  } catch (err) {
    return errorFromCatch(err);
  }
}
