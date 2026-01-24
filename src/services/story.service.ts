import fs from 'fs';
import { Response } from 'express';
import { pool } from '../config/dbConfig';
import { AuthRequest } from '../models/user.model';
import * as StoryService from '../services/story.service';
import { IStory, IChapter, ICreateStoryRequest, ICreateChapterRequest } from '../models/story.model';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const createStory = async (authorId: number, data: ICreateStoryRequest): Promise<number> => {
  const sql = `INSERT INTO stories (title, description, cover_image_path, author_id) VALUES (?, ?, ?, ?)`;
  const [result] = await pool.execute<ResultSetHeader>(sql, [
    data.title, 
    data.description || null, 
    data.coverImagePath || null,
    authorId
  ]);
  return result.insertId;
};

export const searchStories = async (keyword?: string): Promise<IStory[]> => {
  let sql = `SELECT id, title, description, cover_image_path as coverImagePath, 
             author_id as authorId, status, view_count as viewCount, created_at as createdAt 
             FROM stories`;
  const params: any[] = [];

  if (keyword) {
    sql += ` WHERE MATCH(title, description) AGAINST(? IN NATURAL LANGUAGE MODE)`;
    params.push(keyword);
  }

  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows as IStory[];
};

export const addChapter = async (data: ICreateChapterRequest): Promise<number> => {
  const sql = `INSERT INTO chapters (story_id, order_num, title, content) VALUES (?, ?, ?, ?)`;
  const [result] = await pool.execute<ResultSetHeader>(sql, [
    data.storyId, 
    data.orderNum, 
    data.title, 
    data.content
  ]);
  return result.insertId;
};

export const addChaptersFromFile = async (req: AuthRequest, res: Response) => {
  try {
    const { storyId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: "No files uploaded" });
    }

    const results = [];

    for (const [index, file] of files.entries()) {
      const content = fs.readFileSync(file.path, 'utf8');
      
      const chapterData = {
        storyId: parseInt(storyId),
        orderNum: index + 1,
        title: file.originalname.replace(/\.[^/.]+$/, ""),
        content: content
      };

      const chapterId = await StoryService.addChapter(chapterData);
      results.push({ chapterId, title: chapterData.title });

      fs.unlinkSync(file.path);
    }

    res.status(201).json({
      success: true,
      message: `${results.length} chapters added successfully`,
      data: results
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getChaptersByStoryId = async (storyId: number): Promise<IChapter[]> => {
  const sql = `SELECT id, story_id as storyId, order_num as orderNum, title, content, created_at as createdAt 
               FROM chapters WHERE story_id = ? ORDER BY order_num ASC`;
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [storyId]);
  return rows as IChapter[];
};

export const incrementViewCount = async (storyId: number): Promise<void> => {
  const sql = `UPDATE stories SET view_count = view_count + 1 WHERE id = ?`;
  await pool.execute(sql, [storyId]);
};

export const incrementFavoriteCount = async (storyId: number): Promise<void> => {
  const sql = `UPDATE stories SET favorite_count = favorite_count + 1 WHERE id = ?`;
  await pool.execute(sql, [storyId]);
};

export const getStoryById = async (storyId: number): Promise<IStory | null> => {
  const sql = `
    SELECT 
      id, 
      title, 
      description, 
      cover_image_path as coverImagePath, 
      author_id as authorId, 
      status, 
      view_count as viewCount, 
      favorite_count as favoriteCount, 
      created_at as createdAt 
    FROM stories 
    WHERE id = ?`;
    
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [storyId]);
  return rows.length > 0 ? (rows[0] as IStory) : null;
};