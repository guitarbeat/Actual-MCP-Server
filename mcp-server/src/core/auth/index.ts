import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compares two strings using a constant-time algorithm to prevent timing attacks.
 *
 * This function hashes both inputs using SHA-256 before comparing them.
 * This ensures that the comparison takes the same amount of time regardless of
 * the content of the strings, and handles strings of different lengths securely
 * (since the hashes will have the same length).
 *
 * @param a The first string to compare (e.g., the user-provided token)
 * @param b The second string to compare (e.g., the expected token)
 * @returns True if the strings are equal, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();

  return timingSafeEqual(hashA, hashB);
}
