import { describe, expect, it } from 'vitest';
import {
  MIN_BEARER_TOKEN_LENGTH,
  shouldWarnAboutAutoSyncForRemote,
  validateBearerStartupConfig,
} from './startup-guard.js';

describe('startup-guard', () => {
  it('allows startup when bearer auth is disabled', () => {
    expect(() => validateBearerStartupConfig(false, undefined)).not.toThrow();
  });

  it('rejects missing bearer tokens when bearer auth is enabled', () => {
    expect(() => validateBearerStartupConfig(true, undefined)).toThrow(
      'BEARER_TOKEN is required when --enable-bearer is enabled',
    );
  });

  it('rejects weak bearer tokens when bearer auth is enabled', () => {
    expect(() => validateBearerStartupConfig(true, 'short-token')).toThrow(
      `BEARER_TOKEN must be at least ${MIN_BEARER_TOKEN_LENGTH} characters when --enable-bearer is enabled`,
    );
  });

  it('accepts strong bearer tokens when bearer auth is enabled', () => {
    expect(() =>
      validateBearerStartupConfig(true, 'a'.repeat(MIN_BEARER_TOKEN_LENGTH)),
    ).not.toThrow();
  });

  it('warns when remote auto-sync is unset or disabled', () => {
    expect(shouldWarnAboutAutoSyncForRemote(undefined)).toBe(true);
    expect(shouldWarnAboutAutoSyncForRemote('0')).toBe(true);
  });

  it('does not warn when remote auto-sync is configured', () => {
    expect(shouldWarnAboutAutoSyncForRemote('5')).toBe(false);
  });
});
