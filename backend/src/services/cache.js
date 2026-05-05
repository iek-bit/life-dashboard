import NodeCache from 'node-cache';

// Cache with 5-minute TTL (configurable via env)
const cacheTTL = parseInt(process.env.CACHE_TTL || '300', 10);
export const cache = new NodeCache({ stdTTL: cacheTTL });

export const cacheService = {
  get: (key) => cache.get(key),
  set: (key, value) => cache.set(key, value),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),
  invalidateUserData: (userId) => {
    // Invalidate all data for a specific user
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.startsWith(`google_${userId}_`)) {
        cache.del(key);
      }
    });
  }
};
