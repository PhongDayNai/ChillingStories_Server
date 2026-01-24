import { Request } from 'express';

export type UserRole = 'admin' | 'author' | 'viewer';

export interface IUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface IRegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface IUserPayload {
  id: number;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: IUserPayload;
}