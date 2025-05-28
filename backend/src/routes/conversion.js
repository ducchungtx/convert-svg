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
