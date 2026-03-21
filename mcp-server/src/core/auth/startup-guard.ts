export const MIN_BEARER_TOKEN_LENGTH = 32;

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

export function shouldWarnAboutAutoSyncForRemote(autoSyncIntervalMinutes?: string): boolean {
  if (!autoSyncIntervalMinutes) {
    return true;
  }

  const parsed = Number.parseInt(autoSyncIntervalMinutes, 10);
  return Number.isNaN(parsed) || parsed <= 0;
}
