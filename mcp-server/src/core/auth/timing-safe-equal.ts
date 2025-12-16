import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

/**
 * Compare two strings in constant time to prevent timing attacks.
 * This is crucial for verifying authentication tokens.
 *
 * @param a - First string (e.g., received token)
 * @param b - Second string (e.g., expected token)
 * @returns True if strings match, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    // Always compare buffers of equal length to avoid length leakage
    // If lengths differ, we still perform a comparison (against itself)
    // to maintain somewhat constant time, though length check is unavoidable.
    // Ideally, tokens should be hashes of fixed length.
    if (bufA.length !== bufB.length) {
      // Simulate comparison to reduce timing side channel for length
      timingSafeEqual(bufB, bufB);
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  } catch {
    // Fallback for any unexpected errors during comparison
    return false;
  }
}
