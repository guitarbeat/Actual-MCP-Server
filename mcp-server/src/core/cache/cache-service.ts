/**
 * Cache service with LRU eviction and TTL support.
 * Provides in-memory caching for frequently accessed data.
 * Uses lru-cache library for efficient LRU implementation.
 */

import { LRUCache } from 'lru-cache';

/**
 * Cache statistics for monitoring cache performance.
 */
export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  hitRate: number;
}

/**
 * Cache service implementing LRU eviction with TTL support.
 * Singleton pattern ensures single cache instance across the application.
 * Uses lru-cache library for optimized LRU implementation.
 */
export class CacheService {
  // biome-ignore lint/suspicious/noExplicitAny: Cache stores values of various types
  private cache: LRUCache<string, any>;
  // biome-ignore lint/suspicious/noExplicitAny: Pending promises can resolve to any type
  private pendingPromises: Map<string, Promise<any>>;
  private hits: number;
  private misses: number;
  private readonly enabled: boolean;

  constructor() {
    const maxEntries = parseInt(process.env.CACHE_MAX_ENTRIES || '1000', 10);
    const defaultTtl = parseInt(process.env.CACHE_TTL_SECONDS || '300', 10) * 1000;
    this.enabled = process.env.CACHE_ENABLED !== 'false';

    // biome-ignore lint/suspicious/noExplicitAny: Cache stores values of various types
    this.cache = new LRUCache<string, any>({
      max: maxEntries,
      ttl: defaultTtl,
      updateAgeOnGet: true, // LRU behavior - update access time on get
    });

    this.pendingPromises = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get data from cache or fetch if missing/expired.
   *
   * @param key - Cache key
   * @param fetchFn - Function to fetch data if not in cache
   * @param ttl - Time to live in milliseconds (optional)
   * @returns Cached or freshly fetched data
   */
  async getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    if (!this.enabled) {
      return fetchFn();
    }

    const cached = this.get<T>(key);
    if (cached !== null) {
      this.hits++;
      return cached;
    }

    // Check for in-flight requests to prevent cache stampede
    if (this.pendingPromises.has(key)) {
      return this.pendingPromises.get(key) as Promise<T>;
    }

    this.misses++;

    const promise = (async () => {
      try {
        const data = await fetchFn();
        this.set(key, data, ttl);
        return data;
      } finally {
        this.pendingPromises.delete(key);
      }
    })();

    this.pendingPromises.set(key, promise);
    return promise;
  }

  /**
   * Get data from cache if exists and not expired.
   *
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  private get<T>(key: string): T | null {
    const value = this.cache.get(key) as T | undefined;
    return value ?? null;
  }

  /**
   * Manually set cache entry.
   *
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    if (!this.enabled) {
      return;
    }

    if (ttl !== undefined) {
      this.cache.set(key, data, { ttl });
    } else {
      this.cache.set(key, data);
    }
  }

  /**
   * Invalidate specific cache entry.
   *
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate multiple entries by pattern.
   * Supports wildcard matching with '*'.
   *
   * @param pattern - Pattern to match keys (e.g., 'accounts:*')
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics.
   *
   * @returns Cache statistics including hits, misses, entries, and hit rate
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      entries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Check if caching is enabled.
   *
   * @returns True if caching is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const cacheService = new CacheService();
