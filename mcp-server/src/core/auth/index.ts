import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compares two strings in constant time to prevent timing attacks.
 * Uses SHA-256 hashing to ensure inputs are of equal length before comparison.
 *
 * @param a - The first string to compare (e.g., user input)
 * @param b - The second string to compare (e.g., stored secret)
 * @returns True if strings match, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
