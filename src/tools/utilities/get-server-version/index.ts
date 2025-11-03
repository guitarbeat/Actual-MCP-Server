// ----------------------------
// GET SERVER VERSION TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
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
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const version = await getServerVersion();

    return successWithJson(version);
  } catch (err) {
    return errorFromCatch(err);
  }
}

