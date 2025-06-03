const rateLimit = require('express-rate-limit');
const { rateLimit: redisRateLimit } = require('../utils/redis');
const { getUserById } = require('../utils/database');
const logger = require('../utils/logger');

// Create rate limiter with Redis store
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message,
        statusCode: 429,
        type: 'RATE_LIMIT_EXCEEDED',
      },
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests,
    skipFailedRequests,

    // Custom key generator
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    },

    // Custom skip function
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user?.role === 'ADMIN';
    },

    // Custom handler
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
      });

      res.status(429).json({
        success: false,
        error: {
          message,
          statusCode: 429,
          type: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000),
        },
        timestamp: new Date().toISOString(),
      });
    },
  });
};

// Different rate limiters for different endpoints
const rateLimiters = {
  // Global rate limiter
  global: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests, please try again later.',
  }),

  // Auth endpoints (stricter)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
  }),

  // File conversion (very strict)
  conversion: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 conversions per hour for guests
    message: 'Conversion limit exceeded. Please register for higher limits.',
  }),

  // Admin endpoints
  admin: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200, // 200 requests per 5 minutes
    message: 'Too many admin requests, please slow down.',
  }),
};

// Custom conversion rate limiter with user-based limits
const conversionRateLimit = async (req, res, next) => {
  try {
    // Skip rate limiting in test and development environments
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      return next();
    }

    const ip = req.ip;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Determine rate limits based on user type
    let identifier, windowSeconds, maxRequests;

    if (userId) {
      identifier = `user:${userId}`;

      switch (userRole) {
        case 'ADMIN':
          return next(); // No limits for admin
        case 'PREMIUM':
          windowSeconds = 24 * 60 * 60; // 24 hours
          maxRequests = 500;
          break;
        case 'USER':
        default:
          windowSeconds = 24 * 60 * 60; // 24 hours
          maxRequests = 50;
          break;
      }
    } else {
      // Guest user - IP based
      identifier = `guest:${ip}`;
      windowSeconds = 60 * 60; // 1 hour
      maxRequests = 5;
    }

    // Check rate limit using Redis
    const limitResult = await redisRateLimit.checkLimit(
      identifier,
      windowSeconds,
      maxRequests
    );

    // Set headers
    res.set({
      'X-RateLimit-Limit': limitResult.limit,
      'X-RateLimit-Remaining': limitResult.remaining,
      'X-RateLimit-Reset': limitResult.resetTime.getTime(),
    });

    if (!limitResult.allowed) {
      logger.warn('Conversion rate limit exceeded', {
        identifier,
        current: limitResult.current,
        limit: limitResult.limit,
        ip,
        userId,
        userRole,
      });

      return res.status(429).json({
        success: false,
        error: {
          message: userId
            ? `Daily conversion limit exceeded (${limitResult.limit}). Upgrade to premium for higher limits.`
            : `Hourly conversion limit exceeded (${limitResult.limit}). Please register for higher limits.`,
          statusCode: 429,
          type: 'CONVERSION_LIMIT_EXCEEDED',
          current: limitResult.current,
          limit: limitResult.limit,
          remaining: limitResult.remaining,
          resetTime: limitResult.resetTime,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Store rate limit info for later use
    req.rateLimit = limitResult;
    next();

  } catch (error) {
    logger.error('Rate limit middleware error:', error);
    // Allow request if rate limiting fails
    next();
  }
};

// Middleware to apply appropriate rate limiter based on route
const rateLimitMiddleware = (req, res, next) => {
  // Skip rate limiting in test and development environments
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return next();
  }

  const path = req.path;

  // Apply specific rate limiters
  if (path.startsWith('/api/auth')) {
    return rateLimiters.auth(req, res, next);
  }

  if (path.startsWith('/api/convert')) {
    return conversionRateLimit(req, res, next);
  }

  if (path.startsWith('/api/admin')) {
    return rateLimiters.admin(req, res, next);
  }

  // Apply global rate limiter for other routes
  return rateLimiters.global(req, res, next);
};

module.exports = rateLimitMiddleware;
