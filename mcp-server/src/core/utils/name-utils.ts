/**
 * Shared utilities for name normalization and ID detection.
 * Used by NameResolver and other components that need to match entity names.
 */

// Remove emojis using Unicode ranges
// This covers most emoji ranges: Emoticons, Miscellaneous Symbols, Dingbats, etc.
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}]|[\u{FE0F}]/gu;

/**
 * Check if a string looks like a UUID/ID (contains hyphens or is alphanumeric).
 * Actual Budget uses various ID formats, so we use a permissive check.
 *
 * @param value - String to check
 * @returns True if the value appears to be an ID
 */
export function isId(value: string): boolean {
  // IDs typically contain hyphens or are long alphanumeric strings
  // This is a permissive check to avoid false negatives
  return value.includes('-') || (value.length > 20 && /^[a-zA-Z0-9]+$/.test(value));
}

/**
 * Normalize a name for comparison by removing emojis and trimming whitespace.
 * This allows matching "Chase Checking" with "🏦 Chase Checking".
 *
 * @param name - Name to normalize
 * @returns Normalized name (lowercase, emojis removed, trimmed)
 */
export function normalizeName(name: string): string {
  return name.replace(EMOJI_REGEX, '').trim().toLowerCase();
}
