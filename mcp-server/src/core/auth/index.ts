import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compares two strings using a constant-time algorithm to prevent timing attacks.
 * This implementation hashes inputs first to ensure length-independence.
 *
 * @param a - First string (e.g. user provided token)
 * @param b - Second string (e.g. expected token)
 * @returns True if strings are equal, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
