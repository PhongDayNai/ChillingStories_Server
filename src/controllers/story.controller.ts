import { Response } from 'express';
import fs from 'fs';
import { AuthRequest } from '../models/user.model';
import { ICreateStoryRequest } from '../models/story.model';
import * as StoryService from '../services/story.service';

/**
 * Handle story metadata creation
 */
export const createStory = async (req: AuthRequest, res: Response) => {
  try {
    const authorId = req.user?.id;
    if (!authorId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const posterFilename = req.file ? req.file.filename : null;

    const storyData: ICreateStoryRequest = {
      title: req.body.title,
      description: req.body.description,
      posterFilename: posterFilename
    };

    const storyId = await StoryService.createStory(authorId, storyData);
    
    const imageLink = posterFilename 
      ? `${req.protocol}://${req.get('host')}/assets/images/poster/stories/${posterFilename}` 
      : null;

    res.status(201).json({
      success: true,
      data: { 
        storyId,
        posterFilename,
        posterLink: imageLink 
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search and list stories
 */
export const getAllStories = async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const stories = await StoryService.searchStories(search as string);
    
    res.status(200).json({ success: true, data: stories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Handle multi-file upload for chapters
 * Logic extracted from your current service file for better separation
 */
export const addChaptersFromFiles = async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const { storyId } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: "No files uploaded" });
  }

  const results = [];
  try {
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
    files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Fetch chapters for a specific story
 */
export const getStoryChapters = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const chapters = await StoryService.getChaptersByStoryId(storyId);
    
    await StoryService.incrementViewCount(storyId);

    res.status(200).json({ success: true, data: chapters });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};