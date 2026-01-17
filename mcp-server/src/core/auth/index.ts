import { timingSafeEqual } from 'node:crypto';

/**
 * Compare two strings using a constant-time algorithm to prevent timing attacks.
 * This is useful for comparing authentication tokens, passwords, or other sensitive secrets.
 *
 * @param a The first string to compare (e.g., the user-provided token)
 * @param b The second string to compare (e.g., the expected token)
 * @returns True if the strings are equal, false otherwise. Returns false if either input is not a string.
 */
export function timingSafeStringEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
