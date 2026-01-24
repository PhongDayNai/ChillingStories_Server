import { Response } from 'express';
import { AuthRequest } from '../models/user.model';
import * as UserService from '../services/user.service';

/**
 * Uses AuthRequest because it needs req.user.id from the JWT
 */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const user = await UserService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update current user's profile (Username or Email)
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { username, email } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const updatedUser = await UserService.updateProfile(userId, { username, email });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Admin logic: Fetch all registered users
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Admin logic: Promotes/Demotes a user role
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = parseInt(req.params.id);
    const { role } = req.body; 

    if (!role) {
      return res.status(400).json({ success: false, error: "Role is required" });
    }

    const updatedUser = await UserService.updateUserRole(targetId, role);
    
    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: updatedUser
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};