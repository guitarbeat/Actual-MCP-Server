import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compare two strings using a constant-time algorithm to prevent timing attacks.
 * Uses SHA-256 hashing to ensure inputs are of equal length before comparison.
 *
 * @param a - The first string to compare (e.g., user-provided token)
 * @param b - The second string to compare (e.g., expected secret)
 * @returns True if strings are identical, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  // Use SHA-256 to generate fixed-length hashes for both strings
  // This prevents timing leaks related to the length of the strings
  // and allows using timingSafeEqual which requires buffers of equal length
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();

  return timingSafeEqual(hashA, hashB);
}
