import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/dbConfig';
import { IRegisterRequest } from '../models/user.model';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

export const registerUser = async (userData: IRegisterRequest) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const sql = `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`;
  const values = [userData.username, userData.email, hashedPassword, userData.role || 'viewer'];

  const [result] = await pool.execute<ResultSetHeader>(sql, values);
  return { id: result.insertId, ...userData };
};

export const loginUser = async (email: string, pass: string) => {
  const sql = `SELECT id, username, email, phone, password_hash as passwordHash, role, avatar_url as avatarUrl, created_at as createdAt FROM users WHERE email = ?`;
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [email]);
  
  const user = rows[0];
  if (!user) return null;

  const isMatch = await bcrypt.compare(pass, user.passwordHash);
  if (!isMatch) return null;

  const token = jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { 
    token, 
    user: { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      phone: user.phone, 
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt
    } 
  };
};