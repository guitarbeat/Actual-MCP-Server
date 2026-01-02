import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 * Used for verifying authentication tokens and secrets.
 *
 * @param a - First string (e.g., received token)
 * @param b - Second string (e.g., expected token)
 * @returns true if strings are equal, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
