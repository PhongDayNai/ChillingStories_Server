import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware'; // Your JWT checker
import { authorize } from '../middlewares/role.middleware'; // Your Role checker

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current logged-in user's profile
 * @access  Private (Any logged-in user)
 */
router.get('/profile', authenticateToken, UserController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile details
 * @access  Private
 */
router.put('/profile', authenticateToken, UserController.updateProfile);

/**
 * @route   GET /api/users
 * @desc    Get all users (for Admin dashboard)
 * @access  Private (Admin only)
 */
router.get('/', authenticateToken, authorize(['admin']), UserController.getAllUsers);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update a user's role (Promote to author or admin)
 * @access  Private (Admin only)
 */
router.patch('/:id/role', authenticateToken, authorize(['admin']), UserController.updateUserRole);

export default router;