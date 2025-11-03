import { CacheEntry } from '../commands/types';

/**
 * Simple in-memory cache for API responses
 */
export class Cache {
  private cache: Map<string, CacheEntry<unknown>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 3600) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return undefined;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in seconds (optional)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
  }

  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   * @returns true if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a cache entry
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries from the cache
   * @returns Number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache statistics
   * @returns Object with cache stats
   */
  getStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Generate a cache key from URL and parameters
   * @param url Base URL
   * @param params Query parameters
   * @returns Cache key
   */
  static generateKey(url: string, params?: Record<string, unknown>): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    // Sort parameters for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    return `${url}?${sortedParams}`;
  }
}
