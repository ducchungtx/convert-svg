# Swagger API Documentation Setup

This document explains how Swagger/OpenAPI documentation has been implemented in the File Conversion API backend.

## Overview

Swagger UI provides interactive API documentation that allows developers to:

- Explore all available endpoints
- Test API endpoints directly from the browser
- View request/response schemas
- Understand authentication requirements
- See example requests and responses

## Environment Configuration

Swagger documentation can be enabled or disabled using environment variables:

```env
# Enable or disable Swagger documentation
ENABLE_SWAGGER=true

# Base URL for API documentation
API_BASE_URL=http://localhost:3001
```

### Environment Control

- **Development**: Swagger is typically enabled (`ENABLE_SWAGGER=true`)
- **Production**: Swagger can be disabled for security (`ENABLE_SWAGGER=false`)
- **Testing**: Can be disabled to reduce startup time and dependencies

## Accessing Documentation

When Swagger is enabled, you can access the documentation at:

- **Swagger UI**: `http://localhost:3001/api-docs`
- **OpenAPI JSON**: `http://localhost:3001/api-docs.json`

## Features Implemented

### 1. Comprehensive API Documentation

All endpoints are documented with:

- **Summary and Description**: Clear explanation of what each endpoint does
- **Request Parameters**: Path, query, and body parameters with validation rules
- **Response Schemas**: Detailed response structures for success and error cases
- **Authentication Requirements**: Bearer token requirements where applicable
- **Examples**: Sample requests and responses

### 2. Interactive Testing

- **Try it out**: Test endpoints directly from the Swagger UI
- **Authentication**: Built-in Bearer token authentication support
- **File Upload**: Support for multipart/form-data file uploads
- **Response Validation**: Real-time validation of API responses

### 3. Organized Documentation

Endpoints are organized into logical tags:

- **Authentication**: User registration, login, profile management
- **Conversion**: File conversion operations
- **Admin**: Administrative functions
- **System**: Health checks and system information

### 4. Security Documentation

- **Bearer Authentication**: JWT token-based authentication
- **Role-based Access**: Clear indication of admin-only endpoints
- **Input Validation**: Detailed validation rules for all inputs

## File Structure

```
src/
├── config/
│   └── swagger.js          # Main Swagger configuration
├── routes/
│   ├── auth.js            # Authentication endpoints with Swagger docs
│   ├── conversion.js      # Conversion endpoints with Swagger docs
│   └── admin.js           # Admin endpoints with Swagger docs
└── server.js              # Swagger middleware integration
```

## Configuration Details

### swagger.js

The main configuration file defines:

- **OpenAPI 3.0 specification**
- **API metadata** (title, version, description)
- **Server configurations** (development and production)
- **Security schemes** (Bearer authentication)
- **Reusable schemas** (User, Conversion, Error models)
- **Response templates**

### Route Documentation

Each route file contains:

- **JSDoc-style comments** with Swagger annotations
- **Parameter definitions** with validation rules
- **Response schemas** for all status codes
- **Security requirements** where applicable

## Testing with Swagger

### 1. Authentication Flow

1. Use the `/api/auth/login` endpoint to get a JWT token
2. Click "Authorize" button in Swagger UI
3. Enter the token in the format: `Bearer <your-token>`
4. Test protected endpoints

### 2. File Conversion Flow

1. Authenticate first (if testing protected endpoints)
2. Check supported formats with `/api/conversion/supported`
3. Upload and convert a file with `/api/conversion/convert`
4. Check conversion status with `/api/conversion/status/{id}`
5. Download the result with `/api/conversion/download/{id}`

### 3. Admin Functions

1. Login with admin credentials
2. View system statistics with `/api/admin/stats`
3. Manage users and conversions through admin endpoints

## Sample Test Data

The seeded database includes test accounts for Swagger testing:

```json
{
  "admin": {
    "email": "zrmedia9@gmail.com",
    "password": "your-password",
    "role": "ADMIN"
  },
  "user": {
    "email": "user@convert.com",
    "password": "user123",
    "role": "USER"
  },
  "premium": {
    "email": "premium@convert.com",
    "password": "premium123",
    "role": "PREMIUM"
  }
}
```

## Customization

### Swagger UI Options

The Swagger UI is configured with:

- **Dark theme compatibility**
- **Filter functionality** for endpoints
- **Collapsed sections** by default
- **Alphabetical sorting** of tags and operations
- **Custom CSS** to hide the top bar

### Adding New Endpoints

To document new endpoints:

1. Add JSDoc comments above the route handler
2. Use `@swagger` tags to define the OpenAPI specification
3. Reference existing schemas or define new ones
4. Include all possible response codes

Example:

```javascript
/**
 * @swagger
 * /api/new-endpoint:
 *   get:
 *     summary: Description of the endpoint
 *     tags: [Category]
 *     parameters:
 *       - in: query
 *         name: param
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success response
 */
router.get("/new-endpoint", handler);
```

## Security Considerations

### Production Deployment

For production environments:

- Set `ENABLE_SWAGGER=false` to disable documentation
- If enabled, consider IP restrictions or authentication for the `/api-docs` endpoint
- Ensure sensitive information is not exposed in examples

### Development Safety

- Never commit sensitive tokens or passwords in Swagger examples
- Use placeholder values for sensitive data
- Regularly review and update documentation

## Troubleshooting

### Common Issues

1. **Swagger UI not loading**: Check `ENABLE_SWAGGER` environment variable
2. **Missing endpoints**: Ensure JSDoc comments are properly formatted
3. **Schema errors**: Validate OpenAPI JSON at `/api-docs.json`
4. **Authentication not working**: Verify JWT token format and expiration

### Debugging

- Check server logs for Swagger initialization messages
- Validate OpenAPI specification using online validators
- Test endpoints directly with curl before documenting

## Maintenance

- **Regular Updates**: Keep documentation in sync with API changes
- **Schema Validation**: Ensure response schemas match actual API responses
- **Example Updates**: Keep examples current and realistic
- **Security Review**: Regularly review exposed information in documentation

This Swagger implementation provides a robust, interactive documentation system that enhances the developer experience while maintaining security and flexibility through environment-based configuration.
