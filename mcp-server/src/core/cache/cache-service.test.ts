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
});
