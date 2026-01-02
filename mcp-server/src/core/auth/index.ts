import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 * Uses SHA-256 hashing to ensure inputs are always compared as equal-length buffers.
 *
 * @param a - First string (e.g., received token)
 * @param b - Second string (e.g., expected token)
 * @returns true if strings are equal, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  // Hash the strings to ensure they are the same length
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
