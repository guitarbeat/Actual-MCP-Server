import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheService } from './cache-service.js';

describe('CacheService', () => {
  let cacheService: CacheService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.CACHE_ENABLED = 'true';
    process.env.CACHE_TTL_SECONDS = '1';
    process.env.CACHE_MAX_ENTRIES = '3';
    cacheService = new CacheService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('cache hit/miss scenarios', () => {
    it('should return cached data on cache hit', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ id: '1', name: 'Test' });

      // First call - cache miss
      const result1 = await cacheService.getOrFetch('test-key', fetchFn);
      expect(result1).toEqual({ id: '1', name: 'Test' });
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await cacheService.getOrFetch('test-key', fetchFn);
      expect(result2).toEqual({ id: '1', name: 'Test' });
      expect(fetchFn).toHaveBeenCalledTimes(1);

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should call fetch function on cache miss', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await cacheService.getOrFetch('new-key', fetchFn);

      expect(result).toEqual({ data: 'fresh' });
      expect(fetchFn).toHaveBeenCalledOnce();

      const stats = cacheService.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    it('should calculate hit rate correctly', async () => {
      const fetchFn = vi.fn().mockResolvedValue('data');

      await cacheService.getOrFetch('key1', fetchFn);
      await cacheService.getOrFetch('key1', fetchFn);
      await cacheService.getOrFetch('key1', fetchFn);

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(66.67);
    });
  });

  describe('TTL expiration behavior', () => {
    it('should expire entries after TTL', async () => {
      const fetchFn = vi.fn().mockResolvedValue('data');

      // First call
      await cacheService.getOrFetch('ttl-key', fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire (1 second + buffer)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Second call after expiration
      await cacheService.getOrFetch('ttl-key', fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should use custom TTL when provided', async () => {
      const fetchFn = vi.fn().mockResolvedValue('data');

      // Set with 100ms TTL
      await cacheService.getOrFetch('custom-ttl', fetchFn, 100);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Wait for custom TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should fetch again
      await cacheService.getOrFetch('custom-ttl', fetchFn, 100);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate single cache entry', async () => {
      const fetchFn = vi.fn().mockResolvedValue('data');

      await cacheService.getOrFetch('key1', fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      cacheService.invalidate('key1');

      await cacheService.getOrFetch('key1', fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should invalidate entries by pattern', async () => {
      const fetchFn = vi.fn().mockResolvedValue('data');

      await cacheService.getOrFetch('accounts:1', fetchFn);
      await cacheService.getOrFetch('accounts:2', fetchFn);
      await cacheService.getOrFetch('categories:1', fetchFn);

      cacheService.invalidatePattern('accounts:*');

      const stats = cacheService.getStats();
      expect(stats.entries).toBe(1);

      // Accounts should be refetched
      await cacheService.getOrFetch('accounts:1', fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(4);
    });

    it('should handle pattern with no matches', () => {
      cacheService.set('key1', 'data1');
      cacheService.invalidatePattern('nonexistent:*');

      const stats = cacheService.getStats();
      expect(stats.entries).toBe(1);
    });
  });

  describe('statistics calculation', () => {
    it('should track cache entries count', () => {
      cacheService.set('key1', 'data1');
      cacheService.set('key2', 'data2');

      const stats = cacheService.getStats();
      expect(stats.entries).toBe(2);
    });

    it('should return zero hit rate when no operations', () => {
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should clear statistics on clear', async () => {
      const fetchFn = vi.fn().mockResolvedValue('data');

      await cacheService.getOrFetch('key1', fetchFn);
      await cacheService.getOrFetch('key1', fetchFn);

      cacheService.clear();

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.entries).toBe(0);
    });
  });

  describe('disabled cache mode', () => {
    it('should bypass cache when disabled', async () => {
      process.env.CACHE_ENABLED = 'false';
      const disabledCache = new CacheService();

      const fetchFn = vi.fn().mockResolvedValue('data');

      await disabledCache.getOrFetch('key1', fetchFn);
      await disabledCache.getOrFetch('key1', fetchFn);

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(disabledCache.isEnabled()).toBe(false);
    });

    it('should not store data when disabled', () => {
      process.env.CACHE_ENABLED = 'false';
      const disabledCache = new CacheService();

      disabledCache.set('key1', 'data1');

      const stats = disabledCache.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entry when at capacity', async () => {
      const fetchFn = vi.fn().mockResolvedValue('data');

      // Fill cache to capacity (3 entries)
      await cacheService.getOrFetch('key1', fetchFn);
      await cacheService.getOrFetch('key2', fetchFn);
      await cacheService.getOrFetch('key3', fetchFn);

      // Access key2 to make it more recently used
      await cacheService.getOrFetch('key2', fetchFn);

      // Add new entry, should evict key1 (least recently used)
      await cacheService.getOrFetch('key4', fetchFn);

      const stats = cacheService.getStats();
      expect(stats.entries).toBe(3);

      // key1 should be evicted, so it should fetch again
      fetchFn.mockClear();
      await cacheService.getOrFetch('key1', fetchFn);
      expect(fetchFn).toHaveBeenCalledOnce();
    });
  });
});
