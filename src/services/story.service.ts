import fs from 'fs';
import { Response } from 'express';
import { pool } from '../config/dbConfig';
import { AuthRequest } from '../models/user.model';
import * as StoryService from '../services/story.service';
import { IStory, IChapter, ICreateStoryRequest, ICreateChapterRequest, IGenre } from '../models/story.model';
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

export const createStoryWithGenres = async (authorId: number, data: ICreateStoryRequest, genres: string[]): Promise<number> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const storySql = `INSERT INTO stories (title, description, cover_image_path, author_id) VALUES (?, ?, ?, ?)`;
    const [storyResult] = await connection.execute<ResultSetHeader>(storySql, [
      data.title, 
      data.description || null, 
      data.coverImagePath || null,
      authorId
    ]);
    const storyId = storyResult.insertId;

    if (genres && genres.length > 0) {
      for (let genreName of genres) {
        const normalizedGenre = genreName.trim().toLowerCase();

        await connection.execute(
          'INSERT IGNORE INTO genres (name) VALUES (?)', 
          [normalizedGenre]
        );

        const [genreRows] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM genres WHERE name = ?', 
          [normalizedGenre]
        );
        const genreId = genreRows[0].id;

        await connection.execute(
          'INSERT INTO story_genres (story_id, genre_id) VALUES (?, ?)', 
          [storyId, genreId]
        );
      }
    }

    await connection.commit();
    return storyId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

export const toggleFavorite = async (userId: number, storyId: number): Promise<{ isFavorited: boolean }> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT 1 FROM favorites WHERE user_id = ? AND story_id = ?',
      [userId, storyId]
    );

    let isFavorited = false;

    if (existing.length > 0) {
      await connection.execute('DELETE FROM favorites WHERE user_id = ? AND story_id = ?', [userId, storyId]);
      await connection.execute('UPDATE stories SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id = ?', [storyId]);
      isFavorited = false;
    } else {
      await connection.execute('INSERT INTO favorites (user_id, story_id) VALUES (?, ?)', [userId, storyId]);
      await connection.execute('UPDATE stories SET favorite_count = favorite_count + 1 WHERE id = ?', [storyId]);
      isFavorited = true;
    }

    await connection.commit();
    return { isFavorited };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getStoryById = async (storyId: number): Promise<any | null> => {
  const sql = `
    SELECT 
      s.id, 
      s.title, 
      s.description, 
      s.cover_image_path as coverImagePath, 
      s.author_id as authorId, 
      s.status, 
      s.view_count as viewCount, 
      s.favorite_count as favoriteCount, 
      s.created_at as createdAt,
      (SELECT COUNT(*) FROM chapters WHERE story_id = s.id) as chapterCount
    FROM stories s
    WHERE s.id = ?`;
    
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [storyId]);
  return rows.length > 0 ? rows[0] : null;
};

export const getChapterById = async (chapterId: number): Promise<IChapter | null> => {
  const sql = `
    SELECT 
      id, 
      story_id as storyId, 
      order_num as orderNum, 
      title, 
      content, 
      created_at as createdAt 
    FROM chapters 
    WHERE id = ?`;
    
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [chapterId]);
  return rows.length > 0 ? (rows[0] as IChapter) : null;
};

export const getChapterByOrder = async (storyId: number, orderNum: number): Promise<IChapter | null> => {
  const sql = `
    SELECT 
      id, 
      story_id as storyId, 
      order_num as orderNum, 
      title, 
      content, 
      created_at as createdAt 
    FROM chapters 
    WHERE story_id = ? AND order_num = ?`;
    
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [storyId, orderNum]);
  return rows.length > 0 ? (rows[0] as IChapter) : null;
};

export const updateChapterTitle = async (chapterId: number, newTitle: string): Promise<boolean> => {
  const sql = `UPDATE chapters SET title = ? WHERE id = ?`;
  const [result] = await pool.execute<ResultSetHeader>(sql, [newTitle, chapterId]);
  return result.affectedRows > 0;
};

export const getAllGenres = async (): Promise<IGenre[]> => {
  const sql = `SELECT id, name FROM genres ORDER BY name ASC`;
  const [rows] = await pool.execute<RowDataPacket[]>(sql);
  return rows as IGenre[];
};

export const updateStoryGenres = async (storyId: number, genres: string[]): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute('DELETE FROM story_genres WHERE story_id = ?', [storyId]);

    if (genres && genres.length > 0) {
      for (let genreName of genres) {
        const normalizedGenre = genreName.trim().toLowerCase();

        await connection.execute('INSERT IGNORE INTO genres (name) VALUES (?)', [normalizedGenre]);
        
        const [genreRows] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM genres WHERE name = ?', 
          [normalizedGenre]
        );
        const genreId = genreRows[0].id;

        await connection.execute(
          'INSERT INTO story_genres (story_id, genre_id) VALUES (?, ?)', 
          [storyId, genreId]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getNewestStories = async (): Promise<any[]> => {
  const sql = `
    SELECT 
      s.id, s.title, s.description, s.cover_image_path as coverImagePath, 
      s.author_id as authorId, s.status, s.view_count as viewCount, 
      s.favorite_count as favoriteCount, s.created_at as createdAt,
      (SELECT COUNT(*) FROM chapters WHERE story_id = s.id) as chapterCount
    FROM stories s
    ORDER BY s.created_at DESC 
    LIMIT 30`;
    
  const [rows] = await pool.execute<RowDataPacket[]>(sql);
  return rows;
};

export const getTopStoriesByView = async (): Promise<any[]> => {
  const sql = `
    SELECT 
      s.id, s.title, s.description, s.cover_image_path as coverImagePath, 
      s.author_id as authorId, s.status, s.view_count as viewCount, 
      s.favorite_count as favoriteCount, s.created_at as createdAt,
      (SELECT COUNT(*) FROM chapters WHERE story_id = s.id) as chapterCount
    FROM stories s
    ORDER BY s.view_count DESC 
    LIMIT 30`;
    
  const [rows] = await pool.execute<RowDataPacket[]>(sql);
  return rows;
};


export const getTopStoriesByFavorite = async (): Promise<any[]> => {
  const sql = `
    SELECT 
      s.id, s.title, s.description, s.cover_image_path as coverImagePath, 
      s.author_id as authorId, s.status, s.view_count as viewCount, 
      s.favorite_count as favoriteCount, s.created_at as createdAt,
      (SELECT COUNT(*) FROM chapters WHERE story_id = s.id) as chapterCount
    FROM stories s
    ORDER BY s.favorite_count DESC 
    LIMIT 30`;
    
  const [rows] = await pool.execute<RowDataPacket[]>(sql);
  return rows;
};

export const getStoriesByAuthor = async (userId: number): Promise<any[]> => {
  const sql = `
    SELECT 
      s.id, s.title, s.description, s.cover_image_path as coverImagePath, 
      s.status, s.view_count as viewCount, s.favorite_count as favoriteCount, 
      s.created_at as createdAt,
      (SELECT COUNT(*) FROM chapters WHERE story_id = s.id) as chapterCount
    FROM stories s
    WHERE s.author_id = ?
    ORDER BY s.created_at DESC`;
    
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [userId]);
  return rows;
};