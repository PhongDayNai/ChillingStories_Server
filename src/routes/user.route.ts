import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { avatarUpload } from '../middlewares/upload.middleware';

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current logged-in user's profile
 * @access  Private (Any logged-in user)
 */
router.get('/profile', authenticateToken, UserController.getProfile);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user profile information
 * @access  Public
 */
router.get('/:userId', UserController.getUserInfo);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile details
 * @access  Private
 */
router.put(
  '/profile', 
  authenticateToken, 
  avatarUpload.single('avatar_image'),
  UserController.updateProfile
);

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