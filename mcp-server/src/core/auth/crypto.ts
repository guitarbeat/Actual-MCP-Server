import { timingSafeEqual } from 'node:crypto';

/**
 * Compares two strings using a constant-time algorithm to prevent timing attacks.
 * This is crucial for verifying authentication tokens and secrets.
 *
 * @param a The first string to compare (e.g., user-provided token)
 * @param b The second string to compare (e.g., expected token)
 * @returns True if the strings are identical, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
