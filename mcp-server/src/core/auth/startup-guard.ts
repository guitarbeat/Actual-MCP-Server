export const MIN_BEARER_TOKEN_LENGTH = 32;

export type ActualAuthMethod = 'password' | 'session-token' | 'none';

function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
}

export function validateBearerStartupConfig(enableBearer: boolean, expectedToken?: string): void {
  if (!enableBearer) {
    return;
  }

  if (!expectedToken) {
    throw new Error('BEARER_TOKEN is required when --enable-bearer is enabled');
  }

  if (expectedToken.length < MIN_BEARER_TOKEN_LENGTH) {
    throw new Error(
      `BEARER_TOKEN must be at least ${MIN_BEARER_TOKEN_LENGTH} characters when --enable-bearer is enabled`,
    );
  }
}

export function validateHttpBindStartupConfig(enableBearer: boolean, host?: string): void {
  if (enableBearer || !host) {
    return;
  }

  if (!isLoopbackHost(host)) {
    throw new Error(
      'A non-loopback --host requires --enable-bearer. Bind to localhost/127.0.0.1 for unauthenticated local development.',
    );
  }
}

export function getActualAuthMethod(env: NodeJS.ProcessEnv = process.env): ActualAuthMethod {
  const hasPassword = Boolean(env.ACTUAL_PASSWORD);
  const hasSessionToken = Boolean(env.ACTUAL_SESSION_TOKEN);

  if (hasPassword && hasSessionToken) {
    return 'none';
  }

  if (hasSessionToken) {
    return 'session-token';
  }

  if (hasPassword) {
    return 'password';
  }

  return 'none';
}

export function validateActualAuthStartupConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (!env.ACTUAL_SERVER_URL) {
    return;
  }

  const hasPassword = Boolean(env.ACTUAL_PASSWORD);
  const hasSessionToken = Boolean(env.ACTUAL_SESSION_TOKEN);

  if (hasPassword && hasSessionToken) {
    throw new Error(
      'Set exactly one of ACTUAL_PASSWORD or ACTUAL_SESSION_TOKEN when ACTUAL_SERVER_URL is configured',
    );
  }

  if (!hasPassword && !hasSessionToken) {
    throw new Error(
      'Set one of ACTUAL_PASSWORD or ACTUAL_SESSION_TOKEN when ACTUAL_SERVER_URL is configured',
    );
  }
}

export function shouldWarnAboutAutoSyncForRemote(autoSyncIntervalMinutes?: string): boolean {
  if (!autoSyncIntervalMinutes) {
    return true;
  }

  const parsed = Number.parseInt(autoSyncIntervalMinutes, 10);
  return Number.isNaN(parsed) || parsed <= 0;
}
