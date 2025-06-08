require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

// Import utilities
const logger = require('./src/utils/logger');
const { connectDatabase } = require('./src/utils/database');
const { initializeRedis } = require('./src/utils/redis');

// Import middleware
const { errorHandler } = require('./src/middleware/errorHandler');
const { notFound } = require('./src/middleware/notFound');
const rateLimitMiddleware = require('./src/middleware/rateLimit');

// Import routes
const authRoutes = require('./src/routes/auth');
const conversionRoutes = require('./src/routes/conversion');
const adminRoutes = require('./src/routes/admin');

// Swagger setup (conditionally imported)
let swaggerUi, swaggerSpecs;
if (process.env.ENABLE_SWAGGER === 'true') {
  swaggerUi = require('swagger-ui-express');
  swaggerSpecs = require('./src/config/swagger');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate limiting
app.use(rateLimitMiddleware);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger Documentation (conditionally enabled)
if (process.env.ENABLE_SWAGGER === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha'
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'File Conversion API Documentation'
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpecs);
  });

  logger.info('📚 Swagger documentation enabled at /api-docs');
}

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     description: Check if the API server is running and healthy
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 */
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversion', conversionRoutes);
app.use('/api/admin', adminRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information endpoint
 *     tags: [System]
 *     description: Get basic information about the API
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: File Conversion API Server
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 status:
 *                   type: string
 *                   example: running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: string
 *                       example: /api/health
 *                     auth:
 *                       type: string
 *                       example: /api/auth
 *                     conversion:
 *                       type: string
 *                       example: /api/conversion
 */
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'File Conversion API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      conversion: '/api/conversion'
    }
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Graceful shutdown starting...`);

  server.close(() => {
    logger.info('HTTP server closed.');

    // Close database connections
    process.exit(0);
  });

  // Force close server after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
}

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Initialize Redis connection
    await initializeRedis();
    logger.info('✅ Redis connected successfully');

    // Start background worker
    require('./src/jobs/worker');
    logger.info('✅ Background worker started');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}`);

      if (process.env.NODE_ENV === 'development') {
        logger.info('\n📋 Available endpoints:');
        logger.info(`   Health: http://localhost:${PORT}/api/health`);
        logger.info(`   Auth: http://localhost:${PORT}/api/auth`);
        logger.info(`   Convert: http://localhost:${PORT}/api/conversion`);
        logger.info(`   Admin: http://localhost:${PORT}/api/admin`);

        if (process.env.ENABLE_SWAGGER === 'true') {
          logger.info(`   📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
          logger.info(`   📄 Swagger JSON: http://localhost:${PORT}/api-docs.json`);
        }
      }
    });

    // Export server for testing
    module.exports = { app, server };

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this file is run directly (not in tests)
if (require.main === module) {
  startServer();
}

module.exports = app;
