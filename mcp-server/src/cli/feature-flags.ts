export function resolveAdvancedFlag(options: {
  enableAdvanced?: boolean;
  enableNiniAlias?: boolean;
}): boolean {
  return Boolean(options.enableAdvanced || options.enableNiniAlias);
}

export function getDeprecatedAdvancedFlagWarning(options: {
  enableNiniAlias?: boolean;
}): string | null {
  if (!options.enableNiniAlias) {
    return null;
  }

  return 'Warning: --enable-nini is deprecated. Use --enable-advanced instead.';
}
