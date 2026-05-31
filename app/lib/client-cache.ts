/**
 * Generic client-side cache with TTL and request deduplication.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

const DEFAULT_TTL_MS = 30_000; // 30 seconds
const pendingRequests = new Map<string, Promise<unknown>>();
const cache = new Map<string, CacheEntry<unknown>>();

function hasValidCache(key: string, ttlMs: number): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttlMs;
}

/**
 * Invalidate a specific cache entry.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries matching a prefix.
 */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cached data.
 */
export function clearAllCache(): void {
  cache.clear();
  pendingRequests.clear();
}

/**
 * Fetch data with client-side caching and request deduplication.
 *
 * @param key - Unique cache key (e.g., "tracking", "settings/locations")
 * @param fetcher - Function that returns the fetch promise
 * @param options - Optional TTL in ms or force refresh
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; forceRefresh?: boolean },
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const forceRefresh = Boolean(options?.forceRefresh);

  // Return cached data if valid
  if (!forceRefresh && hasValidCache(key, ttlMs)) {
    return cache.get(key)!.data as T;
  }

  // Deduplicate concurrent requests for the same key
  if (!forceRefresh && pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  // Start new request
  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Get a snapshot of cached data without fetching.
 */
export function getCacheSnapshot<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.data as T;
}
