/**
 * Cache service with LRU eviction and TTL support.
 * Provides in-memory caching for frequently accessed data.
 */

/**
 * Represents a single cache entry with data, timestamp, and TTL.
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

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
 */
export class CacheService {
  private cache: Map<string, CacheEntry<unknown>>;
  private accessOrder: string[];
  private hits: number;
  private misses: number;
  private readonly maxEntries: number;
  private readonly defaultTtl: number;
  private readonly enabled: boolean;

  constructor() {
    this.cache = new Map();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
    this.maxEntries = parseInt(process.env.CACHE_MAX_ENTRIES || '1000', 10);
    this.defaultTtl = parseInt(process.env.CACHE_TTL_SECONDS || '300', 10) * 1000;
    this.enabled = process.env.CACHE_ENABLED !== 'false';
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

    this.misses++;
    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Get data from cache if exists and not expired.
   *
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  private get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    return entry.data;
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

    // Evict least recently used entry if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    this.updateAccessOrder(key);
  }

  /**
   * Invalidate specific cache entry.
   *
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  /**
   * Invalidate multiple entries by pattern.
   * Supports wildcard matching with '*'.
   *
   * @param pattern - Pattern to match keys (e.g., 'accounts:*')
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.invalidate(key);
    }
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
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

  /**
   * Update access order for LRU tracking.
   *
   * @param key - Cache key
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order tracking.
   *
   * @param key - Cache key
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used entry.
   */
  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder[0];
      this.cache.delete(lruKey);
      this.accessOrder.shift();
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
