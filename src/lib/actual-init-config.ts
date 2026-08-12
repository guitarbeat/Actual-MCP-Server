import config from '../config.js';

/**
 * Options for `@actual-app/api` init.
 *
 * Actual 26+ reads `sessionToken`. Older API builds read `token`. Passing both
 * keeps session-token auth working across those versions. Empty password is
 * omitted so an unused password login path is not attempted.
 */
export function actualApiInitOptions(
  dataDir: string,
  serverURL: string,
  password?: string,
): Record<string, unknown> {
  const sessionToken =
    (config as { ACTUAL_SESSION_TOKEN?: string }).ACTUAL_SESSION_TOKEN ||
    process.env.ACTUAL_SESSION_TOKEN ||
    undefined;
  return {
    dataDir,
    serverURL,
    ...(password ? { password } : {}),
    sessionToken,
    token: sessionToken,
  };
}
