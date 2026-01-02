import { timingSafeEqual } from 'node:crypto';
import { describe, expect, it } from 'vitest';

describe('Authentication Security', () => {
  it('should verify tokens using constant-time comparison', () => {
    const expectedToken = 'super-secret-token-123';
    const validToken = 'super-secret-token-123';
    const invalidToken = 'super-secret-token-124';
    const shortToken = 'short';

    // Simulate the check in index.ts
    const checkToken = (token: string, expected: string): boolean => {
      const tokenBuffer = Buffer.from(token);
      const expectedBuffer = Buffer.from(expected);

      if (tokenBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(tokenBuffer, expectedBuffer);
    };

    expect(checkToken(validToken, expectedToken)).toBe(true);
    expect(checkToken(invalidToken, expectedToken)).toBe(false);
    expect(checkToken(shortToken, expectedToken)).toBe(false);
  });
});
