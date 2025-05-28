const Redis = require('ioredis');
const logger = require('./logger');

let redis = null;

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// Initialize Redis connection
async function initializeRedis() {
  try {
    redis = new Redis(redisConfig);

    redis.on('connect', () => {
      logger.info('Redis connection established');
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Test the connection
    await redis.ping();
    logger.info('Redis ping successful');

    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

// Redis health check
async function checkRedisHealth() {
  try {
    if (!redis) {
      return { status: 'unhealthy', error: 'Redis not initialized' };
    }

    const result = await redis.ping();
    if (result === 'PONG') {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } else {
      return { status: 'unhealthy', error: 'Invalid ping response' };
    }
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Get Redis instance
function getRedis() {
  if (!redis) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redis;
}

// Cache utilities
const cache = {
  // Set cache with expiration
  async set(key, value, ttlSeconds = 3600) {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  },

  // Get from cache
  async get(key) {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  // Delete from cache
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      return await redis.exists(key);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  },

  // Increment counter
  async incr(key, ttlSeconds = 3600) {
    try {
      const value = await redis.incr(key);
      if (value === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return value;
    } catch (error) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  },

  // Set hash field
  async hset(key, field, value, ttlSeconds = 3600) {
    try {
      await redis.hset(key, field, JSON.stringify(value));
      await redis.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.error('Cache hset error:', error);
      return false;
    }
  },

  // Get hash field
  async hget(key, field) {
    try {
      const value = await redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache hget error:', error);
      return null;
    }
  },

  // Get all hash fields
  async hgetall(key) {
    try {
      const hash = await redis.hgetall(key);
      const result = {};

      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }

      return result;
    } catch (error) {
      logger.error('Cache hgetall error:', error);
      return {};
    }
  },

  // Clear all cache (use with caution)
  async flushall() {
    try {
      await redis.flushall();
      logger.warn('Redis cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  },
};

// Rate limiting utilities
const rateLimit = {
  // Check and increment rate limit
  async checkLimit(identifier, windowSeconds, maxRequests) {
    try {
      const key = `rate_limit:${identifier}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);

      return {
        current,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetTime: new Date(Date.now() + ttl * 1000),
        allowed: current <= maxRequests,
      };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      // Allow request if Redis is down
      return {
        current: 0,
        limit: maxRequests,
        remaining: maxRequests,
        resetTime: new Date(Date.now() + windowSeconds * 1000),
        allowed: true,
      };
    }
  },

  // Reset rate limit for identifier
  async resetLimit(identifier) {
    try {
      const key = `rate_limit:${identifier}`;
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Rate limit reset error:', error);
      return false;
    }
  },

  // Get current rate limit status
  async getStatus(identifier) {
    try {
      const key = `rate_limit:${identifier}`;
      const current = await redis.get(key);
      const ttl = await redis.ttl(key);

      return {
        current: parseInt(current) || 0,
        ttl: ttl > 0 ? ttl : 0,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null,
      };
    } catch (error) {
      logger.error('Rate limit status error:', error);
      return { current: 0, ttl: 0, resetTime: null };
    }
  },
};

// Session utilities
const session = {
  // Store session data
  async set(sessionId, data, ttlSeconds = 86400) { // 24 hours default
    try {
      const key = `session:${sessionId}`;
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Session set error:', error);
      return false;
    }
  },

  // Get session data
  async get(sessionId) {
    try {
      const key = `session:${sessionId}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Session get error:', error);
      return null;
    }
  },

  // Delete session
  async destroy(sessionId) {
    try {
      const key = `session:${sessionId}`;
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Session destroy error:', error);
      return false;
    }
  },

  // Extend session TTL
  async extend(sessionId, ttlSeconds = 86400) {
    try {
      const key = `session:${sessionId}`;
      await redis.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.error('Session extend error:', error);
      return false;
    }
  },
};

// Graceful shutdown
async function disconnectRedis() {
  try {
    if (redis) {
      await redis.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
}

module.exports = {
  initializeRedis,
  getRedis,
  checkRedisHealth,
  disconnectRedis,
  cache,
  rateLimit,
  session,
};
