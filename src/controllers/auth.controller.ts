import { Request, Response } from 'express';
import { AuthRequest } from '../models/user.model';
import * as UserService from '../services/user.service';
import * as AuthService from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const user = await AuthService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { userId: user.id }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.loginUser(email, password);

    if (!result) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: "Unauthorized: No user session found" 
      });
    }

    const user = await UserService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database" 
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};