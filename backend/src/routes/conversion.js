const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const conversionController = require('../controllers/conversionController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { upload, validateFile } = require('../middleware/fileUpload');

// Validation rules
const convertValidation = [
  body('targetFormat')
    .isIn(['SVG', 'PNG', 'JPG', 'JPEG', 'PDF', 'EPS'])
    .withMessage('Invalid target format'),
  body('quality')
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage('Quality must be between 10 and 100'),
  body('width')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Width must be between 1 and 10000 pixels'),
  body('height')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Height must be between 1 and 10000 pixels')
];

/**
 * @swagger
 * /api/conversion/supported:
 *   get:
 *     summary: Get supported conversion formats
 *     tags: [Conversion]
 *     description: Returns a list of all supported input and output formats
 *     responses:
 *       200:
 *         description: List of supported conversion formats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     inputFormats:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["SVG", "PNG", "JPG", "JPEG", "PDF"]
 *                     outputFormats:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["SVG", "PNG", "JPG", "JPEG", "PDF", "EPS"]
 *                     conversions:
 *                       type: object
 *                       description: Mapping of input formats to supported output formats
 */

/**
 * @swagger
 * /api/conversion/convert:
 *   post:
 *     summary: Convert a file
 *     tags: [Conversion]
 *     description: Upload and convert a file to the specified format
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to convert
 *               targetFormat:
 *                 type: string
 *                 enum: [SVG, PNG, JPG, JPEG, PDF, EPS]
 *                 description: Target conversion format
 *               quality:
 *                 type: integer
 *                 minimum: 10
 *                 maximum: 100
 *                 description: Output quality (10-100, for lossy formats)
 *               width:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *                 description: Output width in pixels
 *               height:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *                 description: Output height in pixels
 *             required:
 *               - file
 *               - targetFormat
 *     responses:
 *       200:
 *         description: Conversion initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Conversion initiated successfully
 *                 conversion:
 *                   $ref: '#/components/schemas/Conversion'
 *       400:
 *         description: Validation error or unsupported format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/conversion/status/{id}:
 *   get:
 *     summary: Get conversion status
 *     tags: [Conversion]
 *     description: Check the status of a conversion job
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conversion ID
 *     responses:
 *       200:
 *         description: Conversion status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 conversion:
 *                   $ref: '#/components/schemas/Conversion'
 *       404:
 *         description: Conversion not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/conversion/download/{id}:
 *   get:
 *     summary: Download converted file
 *     tags: [Conversion]
 *     description: Download the converted file if conversion is complete
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conversion ID
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Conversion or file not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Conversion not completed or failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/conversion/history:
 *   get:
 *     summary: Get user conversion history
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     description: Get paginated list of user's conversion history
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *         description: Filter by conversion status
 *     responses:
 *       200:
 *         description: Conversion history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Conversion'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/conversion/{id}:
 *   delete:
 *     summary: Delete conversion
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     description: Delete a conversion and its associated files
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conversion ID
 *     responses:
 *       200:
 *         description: Conversion deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Conversion not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized to delete this conversion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Routes
router.get('/supported', conversionController.getSupportedConversions);

router.post('/convert',
  optionalAuth,
  upload,
  validateFile,
  convertValidation,
  conversionController.convertFile
);

router.get('/status/:id', optionalAuth, conversionController.getConversionStatus);
router.get('/download/:id', optionalAuth, conversionController.downloadFile);

// Authenticated routes
router.get('/history', authenticateToken, conversionController.getConversions);
router.delete('/:id', authenticateToken, conversionController.deleteConversion);

module.exports = router;
