import { describe, expect, it } from 'vitest';
import { getDeprecatedAdvancedFlagWarning, resolveAdvancedFlag } from './feature-flags.js';

describe('feature flag helpers', () => {
  it('keeps advanced disabled when neither flag is set', () => {
    expect(resolveAdvancedFlag({ enableAdvanced: false, enableNiniAlias: false })).toBe(false);
  });

  it('enables advanced tools when the new flag is set', () => {
    expect(resolveAdvancedFlag({ enableAdvanced: true, enableNiniAlias: false })).toBe(true);
  });

  it('keeps the deprecated alias working during migration', () => {
    expect(resolveAdvancedFlag({ enableAdvanced: false, enableNiniAlias: true })).toBe(true);
    expect(getDeprecatedAdvancedFlagWarning({ enableNiniAlias: true })).toBe(
      'Warning: --enable-nini is deprecated. Use --enable-advanced instead.',
    );
  });

  it('does not emit a warning when only the new flag is used', () => {
    expect(getDeprecatedAdvancedFlagWarning({ enableNiniAlias: false })).toBeNull();
  });
});
