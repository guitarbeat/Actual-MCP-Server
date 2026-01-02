import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compares two strings using a constant-time algorithm to prevent timing attacks.
 * Uses SHA-256 hashing to ensure both strings are of the same length before comparison.
 *
 * @param a First string to compare (e.g. user provided token)
 * @param b Second string to compare (e.g. expected token)
 * @returns True if strings are equal, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();

  return timingSafeEqual(hashA, hashB);
}
