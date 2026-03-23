import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheService } from './cache-service.js';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    // Reset process.env for each test
    process.env.CACHE_ENABLED = 'true';
    cacheService = new CacheService();
  });

  it('should coalesce duplicate requests', async () => {
    const fetchFn = vi.fn().mockImplementation(async () => {
      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 'data';
    });

    const promises = [
      cacheService.getOrFetch('key1', fetchFn),
      cacheService.getOrFetch('key1', fetchFn),
      cacheService.getOrFetch('key1', fetchFn),
    ];

    const results = await Promise.all(promises);

    expect(results).toEqual(['data', 'data', 'data']);
    expect(fetchFn).toHaveBeenCalledTimes(1); // Expect only 1 call
  });

  it('should not coalesce requests for different keys', async () => {
    const fetchFn = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 'data';
    });

    const promises = [
      cacheService.getOrFetch('key1', fetchFn),
      cacheService.getOrFetch('key2', fetchFn),
    ];

    const results = await Promise.all(promises);

    expect(results).toEqual(['data', 'data']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  describe('invalidatePattern', () => {
    it('should invalidate keys matching wildcard pattern', () => {
      cacheService.set('accounts:123', 'data1');
      cacheService.set('accounts:abc', 'data2');
      cacheService.set('users:456', 'data3');

      cacheService.invalidatePattern('accounts:*');

      expect(cacheService.getStats().entries).toBe(1);
      // @ts-expect-error - testing private method for verification
      expect(cacheService.get('accounts:123')).toBeUndefined();
      // @ts-expect-error - testing private method for verification
      expect(cacheService.get('accounts:abc')).toBeUndefined();
      // @ts-expect-error - testing private method for verification
      expect(cacheService.get('users:456')).toBe('data3');
    });

    it('should escape special characters in pattern', () => {
      cacheService.set('a.b', 'data1');
      cacheService.set('axb', 'data2');

      cacheService.invalidatePattern('a.b');

      // @ts-expect-error - testing private method for verification
      expect(cacheService.get('a.b')).toBeUndefined();
      // @ts-expect-error - testing private method for verification
      expect(cacheService.get('axb')).toBe('data2');
    });

    it('should handle complex patterns with special characters and wildcards', () => {
      cacheService.set('user(1):profile', 'data1');
      cacheService.set('user(2):profile', 'data2');
      cacheService.set('user(1):settings', 'data3');

      cacheService.invalidatePattern('user(1):*');

      // @ts-expect-error - testing private method for verification
      expect(cacheService.get('user(1):profile')).toBeUndefined();
      // @ts-expect-error - testing private method for verification
      expect(cacheService.get('user(1):settings')).toBeUndefined();
      // @ts-expect-error - testing private method for verification
      expect(cacheService.get('user(2):profile')).toBe('data2');
    });

    it('should mitigate ReDoS patterns', () => {
      const redosPattern = '(([a-z])+)+$';
      const longKey = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!';
      cacheService.set(longKey, 'data');

      const start = Date.now();
      cacheService.invalidatePattern(redosPattern);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
      // @ts-expect-error - testing private method for verification
      expect(cacheService.get(longKey)).toBe('data');
    });
  });
});
