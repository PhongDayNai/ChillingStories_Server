import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../models/user.model';
import * as UserService from '../services/user.service';

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

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { username, email, phone } = req.body;
    const avatarFile = req.file;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const currentUser = await UserService.getUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    let newAvatarUrl = undefined;

    if (avatarFile) {
      const oldAvatar = currentUser.avatarUrl;
      const defaultAvatar = '/assets/images/users/avatars/default.png';

      if (oldAvatar && oldAvatar !== defaultAvatar) {
        const oldPath = path.join(__dirname, '../../', oldAvatar);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      newAvatarUrl = `/assets/images/users/avatars/${avatarFile.filename}`;
    }

    const updatedUser = await UserService.updateProfile(userId, { 
      username, 
      email, 
      phone, 
      avatarUrl: newAvatarUrl 
    });

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: "User not found after update" });
    }

    const fullAvatarLink = updatedUser.avatarUrl 
      ? `${req.protocol}://${req.get('host')}${updatedUser.avatarUrl}` 
      : null;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        avatarUrl: fullAvatarLink,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

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