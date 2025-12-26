import { timingSafeEqual, createHash } from 'node:crypto';

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 *
 * Uses SHA-256 hashing to compare strings of arbitrary length without leaking length information
 * (beyond the fact that they don't match).
 *
 * @param a The first string (e.g., the user-provided token)
 * @param b The second string (e.g., the expected token)
 * @returns True if strings match, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  // Use SHA-256 to hash both strings
  // This allows us to compare fixed-length buffers regardless of input length
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();

  return timingSafeEqual(hashA, hashB);
}
