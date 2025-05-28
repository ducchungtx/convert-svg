const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Validation rules
const updateUserValidation = [
  body('role')
    .optional()
    .isIn(['USER', 'PREMIUM', 'ADMIN'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('dailyLimit')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Daily limit must be between 0 and 10000')
];

const updateSettingsValidation = [
  body('settings')
    .isObject()
    .withMessage('Settings must be an object')
];

// Routes
router.get('/stats', adminController.getSystemStats);

// User management
router.get('/users', adminController.getUsers);
router.put('/users/:id', updateUserValidation, adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Conversion management
router.get('/conversions', adminController.getConversions);
router.delete('/conversions/:id', adminController.deleteConversion);

// System settings
router.get('/settings', adminController.getSettings);
router.put('/settings', updateSettingsValidation, adminController.updateSettings);

// Queue management
router.post('/queue/clear-failed', adminController.clearFailedJobs);

// System logs
router.get('/logs', adminController.getLogs);

module.exports = router;
