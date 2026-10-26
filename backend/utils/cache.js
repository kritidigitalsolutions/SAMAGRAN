import Redis from "ioredis";

/**
 * In-Memory Cache store fallback
 * Ensures caching works out-of-the-box even without Redis installed.
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
    // Periodically sweep expired keys every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000).unref();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 120) {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  del(key) {
    this.store.delete(key);
  }

  delByPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiry && now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }
}

const memoryCache = new MemoryCache();

let redisClient = null;
let isRedisConnected = false;

// Initialize Redis only if configured
const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      retryStrategy(times) {
        if (times > 3) {
          console.warn("⚠️ Redis connection failed multiple times. Using In-Memory Cache.");
          return null; // Stop retrying
        }
        return Math.min(times * 500, 2000);
      },
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      console.log("⚡ Redis Connected successfully for backend caching!");
    });

    redisClient.on("error", (err) => {
      isRedisConnected = false;
      // Don't crash on connection error, log friendly warning
      if (err.code === "ECONNREFUSED" || err.message?.includes("connect")) {
        console.warn("⚠️ Redis server not reachable. Automatically falling back to In-Memory Cache.");
      } else {
        console.warn("⚠️ Redis error:", err.message);
      }
    });
  } catch (err) {
    console.warn("⚠️ Redis init failed:", err.message);
    redisClient = null;
    isRedisConnected = false;
  }
} else {
  console.log("ℹ️ No REDIS_URL found in .env. Using high-performance In-Memory Cache.");
}

/**
 * Get value from cache
 */
export const cacheGet = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      // Fallback to memory
    }
  }
  return memoryCache.get(key);
};

/**
 * Set value into cache
 */
export const cacheSet = async (key, value, ttlSeconds = 120) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch {
      // Fallback to memory
    }
  }
  memoryCache.set(key, value, ttlSeconds);
};

/**
 * Delete a specific key from cache
 */
export const cacheDel = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
    } catch {
      // ignore
    }
  }
  memoryCache.del(key);
};

/**
 * Delete keys matching a prefix (e.g., 'items:', 'banners:')
 */
export const cacheDelByPrefix = async (prefix) => {
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch {
      // ignore
    }
  }
  memoryCache.delByPrefix(prefix);
};

/**
 * Express Middleware for route caching
 * Usage: router.get('/items', cacheMiddleware({ ttl: 120, prefix: 'items' }), getItems)
 */
export const cacheMiddleware = ({ ttl = 120, prefix = "cache" } = {}) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const city = req.user?.selectedCity || req.query?.city || "all";
    const cacheKey = `${prefix}:${req.baseUrl || ""}${req.path}:${city}:${JSON.stringify(req.query)}`;

    try {
      const cachedData = await cacheGet(cacheKey);
      if (cachedData) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cachedData);
      }

      // Intercept res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheSet(cacheKey, body, ttl).catch(() => {});
        }
        res.setHeader("X-Cache", "MISS");
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.warn("Cache middleware error:", err.message);
      next();
    }
  };
};
