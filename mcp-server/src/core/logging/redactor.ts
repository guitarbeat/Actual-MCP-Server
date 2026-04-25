/**
 * Redaction utility for sensitive information.
 * Extracts and centralizes redaction of sensitive data like passwords, tokens, and keys.
 */

// Sensitive data patterns for redaction
const SENSITIVE_KEY_REGEX =
  /pass(word|phrase)|(?<!(input|output|max|total)_)token|secret|(private|api|access).?key|authorization|bearer|credential/i;
const BEARER_TOKEN_REGEX = /(Bearer\s+)[a-zA-Z0-9\-._~+/]+=*/gi;

/**
 * Redacts sensitive information from objects and strings.
 * Used as a JSON.stringify replacer or standalone value processor.
 *
 * @param key - The object key (if applicable)
 * @param value - The value to check and potentially redact
 * @returns The original value or a redacted string
 */
export function redactValue(key: string, value: unknown): unknown {
  // Redact based on key name
  if (key && SENSITIVE_KEY_REGEX.test(key)) {
    return '[REDACTED]';
  }

  // Redact sensitive patterns in string values
  if (typeof value === 'string') {
    // Redact Bearer tokens using capture groups to preserve prefix/whitespace
    return value.replace(BEARER_TOKEN_REGEX, '$1[REDACTED]');
  }

  return value;
}
