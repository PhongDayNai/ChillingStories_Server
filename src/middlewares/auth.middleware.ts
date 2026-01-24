import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUserPayload } from '../models/user.model';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as IUserPayload;
    // Attach user data to the request object for use in controllers
    (req as any).user = decoded; 
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};