import { describe, it, expect } from 'vitest';
import { timingSafeStringEqual } from './index.js';

describe('timingSafeStringEqual', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeStringEqual('secret', 'secret')).toBe(true);
    expect(timingSafeStringEqual('', '')).toBe(true);
    expect(
      timingSafeStringEqual(
        'very long secret string that is definitely longer than the other one',
        'very long secret string that is definitely longer than the other one'
      )
    ).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(timingSafeStringEqual('secret', 'wrong')).toBe(false);
    expect(timingSafeStringEqual('secret', 'secre')).toBe(false);
    expect(timingSafeStringEqual('secret', 'secrets')).toBe(false);
    expect(timingSafeStringEqual('', ' ')).toBe(false);
  });

  it('should handle special characters', () => {
    expect(timingSafeStringEqual('p@ssw0rd!', 'p@ssw0rd!')).toBe(true);
    expect(timingSafeStringEqual('p@ssw0rd!', 'p@ssw0rd')).toBe(false);
  });
});
