import { describe, it, expect } from 'vitest';
import { isConnectionError } from './actual-client.js';

describe('isConnectionError', () => {
  it('should return false for "too-many-requests" regardless of connection keywords', () => {
    expect(isConnectionError('network error: too-many-requests')).toBe(false);
    expect(isConnectionError('too-many-requests')).toBe(false);
  });

  it('should return true for known connection error keywords', () => {
    const keywords = [
      'not connected',
      'connection',
      'econnrefused',
      'network',
      'timeout',
      'unknown operator',
      'no budget file is open',
      'budget file',
    ];

    for (const keyword of keywords) {
      // The function expects a lowercase string
      expect(isConnectionError(`some error regarding ${keyword}`)).toBe(true);
    }
  });

  it('should return false for unrelated errors', () => {
    expect(isConnectionError('validation failed')).toBe(false);
    expect(isConnectionError('unauthorized access')).toBe(false);
    expect(isConnectionError('internal server error')).toBe(false);
  });
});
