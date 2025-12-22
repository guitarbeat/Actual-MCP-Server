/**
 * Authentication utilities.
 * Provides secure functions for authentication and token validation.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compare two strings in constant time to prevent timing attacks.
 * Uses SHA-256 hashing to ensure strings are of equal length before comparison.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  // Use SHA-256 to hash both strings
  // This ensures we're comparing buffers of equal length (32 bytes)
  // regardless of input string lengths
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();

  // timingSafeEqual throws if buffer lengths are different,
  // but since we're comparing SHA-256 hashes, lengths are always 32 bytes
  return timingSafeEqual(hashA, hashB);
}
