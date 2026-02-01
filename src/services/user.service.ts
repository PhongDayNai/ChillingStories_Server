import { pool } from '../config/dbConfig';
import { IUser, UserRole } from '../models/user.model';
import { RowDataPacket } from 'mysql2';

export const getUserById = async (id: number): Promise<IUser | null> => {
  const sql = `SELECT id, username, email, phone, role, avatar_url as avatarUrl, created_at as createdAt FROM users WHERE id = ?`;
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [id]);
  return (rows[0] as IUser) || null;
};

export const getAllUsers = async (): Promise<IUser[]> => {
  const sql = `SELECT id, username, email, phone, role, avatar_url as avatarUrl, created_at as createdAt FROM users ORDER BY created_at DESC`;
  const [rows] = await pool.execute<RowDataPacket[]>(sql);
  return rows as IUser[];
};

export const updateProfile = async (
  id: number, 
  data: { username?: string; email?: string; phone?: string; avatarUrl?: string }
) => {
  const sql = `
    UPDATE users 
    SET username = COALESCE(?, username), 
        email = COALESCE(?, email), 
        phone = COALESCE(?, phone), 
        avatar_url = COALESCE(?, avatar_url) 
    WHERE id = ?`;
  
  await pool.execute(sql, [
    data.username || null, 
    data.email || null, 
    data.phone || null, 
    data.avatarUrl || null, 
    id
  ]);
  
  return await getUserById(id);
};

export const updateUserRole = async (id: number, newRole: UserRole) => {
  const sql = `UPDATE users SET role = ? WHERE id = ?`;
  await pool.execute(sql, [newRole, id]);
  return await getUserById(id);
};