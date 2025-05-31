const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'File Conversion API',
      version: '1.0.0',
      description: 'A powerful file conversion API that supports multiple formats including SVG, PNG, JPG, PDF, and more.',
      contact: {
        name: 'API Support',
        email: 'support@convert.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.convert.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            role: {
              type: 'string',
              enum: ['USER', 'PREMIUM', 'ADMIN'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active'
            },
            dailyLimit: {
              type: 'integer',
              description: 'Daily conversion limit'
            },
            usedToday: {
              type: 'integer',
              description: 'Conversions used today'
            },
            resetDate: {
              type: 'string',
              format: 'date-time',
              description: 'Last reset date for daily limit'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Conversion: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique conversion identifier'
            },
            fromFormat: {
              type: 'string',
              description: 'Source file format'
            },
            toFormat: {
              type: 'string',
              description: 'Target file format'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
              description: 'Conversion status'
            },
            originalFileName: {
              type: 'string',
              description: 'Original uploaded file name'
            },
            outputFileName: {
              type: 'string',
              description: 'Generated output file name'
            },
            fileSize: {
              type: 'integer',
              description: 'Original file size in bytes'
            },
            outputFileSize: {
              type: 'integer',
              description: 'Output file size in bytes'
            },
            quality: {
              type: 'integer',
              minimum: 10,
              maximum: 100,
              description: 'Conversion quality (10-100)'
            },
            width: {
              type: 'integer',
              description: 'Output width in pixels'
            },
            height: {
              type: 'integer',
              description: 'Output height in pixels'
            },
            errorMessage: {
              type: 'string',
              description: 'Error message if conversion failed'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            completedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              description: 'User password'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password (min 8 characters with uppercase, lowercase, number, and special character)'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'User full name'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            message: {
              type: 'string'
            },
            user: {
              $ref: '#/components/schemas/User'
            },
            token: {
              type: 'string',
              description: 'JWT access token'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token'
            }
          }
        },
        ConversionRequest: {
          type: 'object',
          required: ['targetFormat'],
          properties: {
            targetFormat: {
              type: 'string',
              enum: ['SVG', 'PNG', 'JPG', 'JPEG', 'PDF', 'EPS'],
              description: 'Target conversion format'
            },
            quality: {
              type: 'integer',
              minimum: 10,
              maximum: 100,
              description: 'Output quality (10-100, applicable for lossy formats)'
            },
            width: {
              type: 'integer',
              minimum: 1,
              maximum: 10000,
              description: 'Output width in pixels'
            },
            height: {
              type: 'integer',
              minimum: 1,
              maximum: 10000,
              description: 'Output height in pixels'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string'
            },
            data: {
              type: 'object'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints'
      },
      {
        name: 'Conversion',
        description: 'File conversion endpoints'
      },
      {
        name: 'Admin',
        description: 'Admin management endpoints'
      },
      {
        name: 'System',
        description: 'System information endpoints'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './server.js'
  ]
};

const specs = swaggerJSDoc(options);

module.exports = specs;
