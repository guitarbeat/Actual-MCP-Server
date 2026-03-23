/**
 * Escapes characters that have special meaning in regular expressions.
 * This prevents regex injection and ensures the string is treated as a literal.
 *
 * @param string - The string to escape
 * @returns The escaped string
 */
export function escapeRegExp(string: string): string {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
