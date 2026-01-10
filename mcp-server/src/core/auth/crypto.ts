import { timingSafeEqual } from 'node:crypto';

/**
 * Compare two strings using a constant-time algorithm to prevent timing attacks.
 * This is crucial for comparing sensitive values like authentication tokens.
 *
 * @param a - The first string to compare (e.g., user-provided token)
 * @param b - The second string to compare (e.g., expected token)
 * @returns True if the strings are equal, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // timingSafeEqual requires buffers of the same length
  if (bufA.length !== bufB.length) {
    // Return false immediately if lengths don't match
    // Note: Leaking length information is generally considered acceptable for
    // token comparisons where the expected token has a fixed or known length,
    // but strict constant-time comparison would require hashing both inputs first.
    // For this use case, checking length first is standard practice in Node.js
    // environment when using timingSafeEqual directly.
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}
