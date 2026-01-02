import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compare two strings in constant time to prevent timing attacks.
 * Uses SHA-256 hashing to ensure both strings are the same length before comparison.
 *
 * @param a First string (e.g., received token)
 * @param b Second string (e.g., expected token)
 * @returns True if strings are equal, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
