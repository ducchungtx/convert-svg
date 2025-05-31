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

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Get comprehensive system statistics including users, conversions, and performance metrics (Admin only)
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
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
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         byRole:
 *                           type: object
 *                     conversions:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         today:
 *                           type: integer
 *                         byStatus:
 *                           type: object
 *                         byFormat:
 *                           type: object
 *                     storage:
 *                       type: object
 *                       properties:
 *                         totalFiles:
 *                           type: integer
 *                         totalSize:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Get paginated list of all users (Admin only)
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
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, PREMIUM, ADMIN]
 *         description: Filter by user role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Update user information (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, PREMIUM, ADMIN]
 *                 description: User role
 *               isActive:
 *                 type: boolean
 *                 description: Active status
 *               dailyLimit:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10000
 *                 description: Daily conversion limit
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *   delete:
 *     summary: Delete user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Delete a user account (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/admin/conversions:
 *   get:
 *     summary: Get all conversions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Get paginated list of all conversions (Admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Conversions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/admin/conversions/{id}:
 *   delete:
 *     summary: Delete conversion (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Delete any conversion as admin
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
 *       404:
 *         description: Conversion not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get system settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Get all system settings (Admin only)
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
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
 *                     settings:
 *                       type: object
 *                       description: Key-value pairs of system settings
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *   put:
 *     summary: Update system settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Update system settings (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 description: Settings to update as key-value pairs
 *             required:
 *               - settings
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid settings data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/admin/queue/clear-failed:
 *   post:
 *     summary: Clear failed jobs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Clear all failed jobs from the conversion queue (Admin only)
 *     responses:
 *       200:
 *         description: Failed jobs cleared successfully
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
 *                 clearedCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

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
