import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../models/user.model';
import { ICreateStoryRequest } from '../models/story.model';
import * as StoryService from '../services/story.service';

export const createStory = async (req: AuthRequest, res: Response) => {
  try {
    const authorId = req.user?.id;
    if (!authorId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const coverImagePath = req.file ? req.file.filename : null;

    const storyData: ICreateStoryRequest = {
      title: req.body.title,
      description: req.body.description,
      coverImagePath: coverImagePath
    };

    const storyId = await StoryService.createStory(authorId, storyData);
    
    const imageLink = coverImagePath 
      ? `${req.protocol}://${req.get('host')}/assets/images/poster/stories/${coverImagePath}` 
      : null;

    res.status(201).json({
      success: true,
      data: { 
        storyId,
        coverImagePath,
        posterLink: imageLink 
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createStoryWithGenres = async (req: AuthRequest, res: Response) => {
  try {
    const authorId = req.user?.id;
    if (!authorId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const posterFilename = req.file ? req.file.filename : null;
    
    const genres = req.body.genres ? JSON.parse(req.body.genres) : [];

    const storyData = {
      title: req.body.title,
      description: req.body.description,
      coverImagePath: posterFilename
    };

    const storyId = await StoryService.createStoryWithGenres(authorId, storyData, genres);
    
    res.status(201).json({
      success: true,
      data: { storyId, genresAdded: genres }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStoryInfo = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const { title, description } = req.body;
    const newPoster = req.file;
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    if (isNaN(storyId)) {
      if (newPoster) fs.unlinkSync(newPoster.path);
      return res.status(400).json({ success: false, error: "Invalid Story ID" });
    }

    const existingStory = await StoryService.getStoryById(storyId);
    if (!existingStory) {
      if (newPoster) fs.unlinkSync(newPoster.path);
      return res.status(404).json({ success: false, error: "Story not found" });
    }

    if (userRole !== 'admin' && existingStory.authorId !== currentUserId) {
      if (newPoster) fs.unlinkSync(newPoster.path);
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    
    if (newPoster) {
      updateData.cover_image_path = newPoster.filename;
      if (existingStory.coverImagePath) {
        const oldPath = path.join(__dirname, '../../assets/images/poster/stories', existingStory.coverImagePath);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    if (Object.keys(updateData).length > 0) {
      await StoryService.updateStory(storyId, updateData);
    }

    const updatedStory = await StoryService.getStoryById(storyId);
    
    const coverLink = updatedStory.coverImagePath 
      ? `${req.protocol}://${req.get('host')}/assets/images/poster/stories/${updatedStory.coverImagePath}`
      : null;

    res.status(200).json({
      success: true,
      message: "Story updated successfully",
      data: {
        ...updatedStory,
        chapterCount: Number(updatedStory.chapterCount),
        coverLink 
      }
    });
  } catch (error: any) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllStories = async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    
    const stories = await StoryService.searchStories(search as string, req.user?.id);
    
    const formattedStories = finalizeStoryLinks(req, stories);
    
    res.status(200).json({ 
      success: true, 
      data: formattedStories 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addSingleChapter = async (req: AuthRequest, res: Response) => {
  try {
    const { storyId, chapterTitle, orderNum } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: "No chapter file uploaded" });
    }

    if (!storyId || !chapterTitle || !orderNum) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, error: "storyId, chapterTitle, and orderNum are required" });
    }

    const content = fs.readFileSync(file.path, 'utf8');

    const chapterData = {
      storyId: parseInt(storyId),
      orderNum: parseInt(orderNum),
      title: chapterTitle,
      content: content
    };

    const chapterId = await StoryService.addChapter(chapterData);

    fs.unlinkSync(file.path);

    res.status(201).json({
      success: true,
      data: {
        chapterId,
        storyId: chapterData.storyId,
        title: chapterData.title,
        orderNum: chapterData.orderNum
      }
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: error.message });
  }
};

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

export const getStoryInfo = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    if (isNaN(storyId)) {
      return res.status(400).json({ success: false, error: "Invalid Story ID" });
    }

    const story = await StoryService.getStoryById(storyId);

    if (!story) {
      return res.status(404).json({ success: false, error: "Story not found" });
    }

    const coverLink = story.coverImagePath 
      ? `${req.protocol}://${req.get('host')}/assets/images/poster/stories/${story.coverImagePath}` 
      : null;

    res.status(200).json({
      success: true,
      data: {
        ...story,
        chapterCount: Number(story.chapterCount),
        coverLink 
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getChapterByNumber = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const orderNum = parseInt(req.params.orderNum);

    if (isNaN(storyId) || isNaN(orderNum)) {
      return res.status(400).json({ success: false, error: "Invalid Story ID or Chapter Number" });
    }

    const chapter = await StoryService.getChapterByOrder(storyId, orderNum);

    if (!chapter) {
      return res.status(404).json({ success: false, error: "Chapter not found" });
    }

    res.status(200).json({
      success: true,
      data: chapter
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getChapterByNumberForUser = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const orderNum = parseInt(req.params.orderNum);
    const userId = req.user?.id;

    if (isNaN(storyId) || isNaN(orderNum)) return res.status(400).json({ success: false, error: "Invalid Params" });

    const chapter = await StoryService.getChapterByOrderWithProgress(storyId, orderNum, userId);

    if (!chapter) return res.status(404).json({ success: false, error: "Not found" });

    res.status(200).json({ success: true, data: chapter });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addView = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    if (isNaN(storyId)) return res.status(400).json({ success: false, error: "Invalid Story ID" });

    await StoryService.incrementViewCount(storyId);
    res.status(200).json({ success: true, message: "View count updated" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleFavoriteStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const storyId = parseInt(req.params.storyId);

    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (isNaN(storyId)) return res.status(400).json({ success: false, error: "Invalid Story ID" });

    const result = await StoryService.toggleFavorite(userId, storyId);

    res.status(200).json({ 
      success: true, 
      isFavorited: result.isFavorited,
      message: result.isFavorited ? "Added to favorites" : "Removed from favorites"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateChapterInfo = async (req: AuthRequest, res: Response) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const { title } = req.body;
    const file = req.file;
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    if (isNaN(chapterId)) return res.status(400).json({ success: false, error: "Invalid Chapter ID" });

    const authorId = await StoryService.getAuthorByChapterId(chapterId);
    if (!authorId) return res.status(404).json({ success: false, error: "Chapter not found" });

    if (userRole !== 'admin' && authorId !== currentUserId) {
      if (file) fs.unlinkSync(file.path);
      return res.status(403).json({ success: false, error: "You don't have permission to update this chapter" });
    }

    const updateData: { title?: string; content?: string } = {};
    if (title) updateData.title = title;
    
    if (file) {
      updateData.content = fs.readFileSync(file.path, 'utf8');
      fs.unlinkSync(file.path);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "Nothing to update" });
    }

    const updated = await StoryService.updateChapter(chapterId, updateData);
    
    res.status(200).json({ 
      success: true, 
      message: "Chapter updated successfully" 
    });
  } catch (error: any) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateChapterByOrderNum = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const orderNum = parseInt(req.params.orderNum);
    const { title } = req.body;
    const file = req.file;
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    if (isNaN(storyId) || isNaN(orderNum)) {
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, error: "Invalid Story ID or Order Number" });
    }

    const authorId = await StoryService.getAuthorByStoryId(storyId);
    if (!authorId) {
      if (file) fs.unlinkSync(file.path);
      return res.status(404).json({ success: false, error: "Story not found" });
    }

    if (userRole !== 'admin' && authorId !== currentUserId) {
      if (file) fs.unlinkSync(file.path);
      return res.status(403).json({ success: false, error: "Unauthorized: You are not the author of this story" });
    }

    const updateData: { title?: string; content?: string } = {};
    if (title) updateData.title = title;
    
    if (file) {
      updateData.content = fs.readFileSync(file.path, 'utf8');
      fs.unlinkSync(file.path);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "No data provided for update (title or file)" });
    }

    const isUpdated = await StoryService.updateChapterByOrder(storyId, orderNum, updateData);

    if (!isUpdated) {
      return res.status(404).json({ success: false, error: "Chapter not found with the given order number" });
    }

    res.status(200).json({ 
      success: true, 
      message: `Chapter ${orderNum} updated successfully` 
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllGenres = async (req: AuthRequest, res: Response) => {
  try {
    const genres = await StoryService.getAllGenres();
    res.status(200).json({ 
      success: true, 
      data: genres 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateGenres = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const { genres } = req.body;

    if (isNaN(storyId)) return res.status(400).json({ success: false, error: "Invalid Story ID" });
    if (!Array.isArray(genres)) return res.status(400).json({ success: false, error: "Genres must be an array" });

    await StoryService.updateStoryGenres(storyId, genres);

    res.status(200).json({ 
      success: true, 
      message: "Story genres updated successfully",
      updatedGenres: genres 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTopNew = async (req: AuthRequest, res: Response) => {
  try {
    const stories = await StoryService.getNewestStoriesUnified(req.user?.id);
    res.status(200).json({ success: true, data: finalizeStoryLinks(req, stories) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTopViewed = async (req: AuthRequest, res: Response) => {
  try {
    const stories = await StoryService.getTopViewsUnified(req.user?.id);
    res.status(200).json({ success: true, data: finalizeStoryLinks(req, stories) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTopFavorited = async (req: AuthRequest, res: Response) => {
  try {
    const stories = await StoryService.getTopFavoritesUnified(req.user?.id);
    res.status(200).json({ success: true, data: finalizeStoryLinks(req, stories) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// export const getStoriesByAuthor = async (req: AuthRequest, res: Response) => {
//   try {
//     const authorId = parseInt(req.params.userId);
    
//     if (isNaN(authorId)) {
//       return res.status(400).json({ success: false, error: "ID tác giả không hợp lệ" });
//     }

//     const viewerId = req.user?.id;

//     const stories = await StoryService.getStoriesByAuthorUnified(authorId, viewerId);
    
//     res.status(200).json({ 
//       success: true, 
//       data: finalizeStoryLinks(req, stories) 
//     });
//   } catch (error: any) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

export const getStoriesByAuthor = async (req: AuthRequest, res: Response) => {
  try {
    const authorId = parseInt(req.params.userId);
    const stories = await StoryService.getStoriesByAuthorUnified(authorId, req.user?.id);
    res.status(200).json({ success: true, data: finalizeStoryLinks(req, stories) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMyFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const stories = await StoryService.getFavoritedStories(userId);
    
    const formattedStories = stories.map(story => ({
      ...story,
      chapterCount: Number(story.chapterCount),
      isFavorited: true,
      coverLink: story.coverImagePath 
        ? `${req.protocol}://${req.get('host')}/assets/images/poster/stories/${story.coverImagePath}` 
        : null
    }));

    return res.status(200).json({ success: true, data: formattedStories });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getUserReadingHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const progressList = await StoryService.getAllReadingProgress(userId);
    
    const formattedProgress = progressList.map(item => ({
      ...item,
      totalChapters: Number(item.totalChapters),
      coverLink: item.coverImagePath 
        ? `${req.protocol}://${req.get('host')}/assets/images/poster/stories/${item.coverImagePath}` 
        : null
    }));

    return res.status(200).json({ 
      success: true, 
      data: formattedProgress 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const removeFromHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const storyId = parseInt(req.params.storyId);

    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (isNaN(storyId)) return res.status(400).json({ success: false, error: "Invalid Story ID" });

    const deleted = await StoryService.deleteReadingProgress(userId, storyId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Progress record not found" });
    }

    res.status(200).json({ 
      success: true, 
      message: "Story removed from reading history" 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeStory = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    
    const story = await StoryService.getStoryById(storyId);
    if (!story) return res.status(404).json({ success: false, error: "Story not found" });

    await StoryService.deleteStory(storyId);

    if (story.coverImagePath) {
      const filePath = path.join(__dirname, '../../assets/images/poster/stories', story.coverImagePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.status(200).json({ success: true, message: "Story and associated files deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeChapterById = async (req: AuthRequest, res: Response) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const deleted = await StoryService.deleteChapterById(chapterId);
    
    if (!deleted) return res.status(404).json({ success: false, error: "Chapter not found" });
    res.status(200).json({ success: true, message: "Chapter deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeChapterByOrder = async (req: AuthRequest, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const orderNum = parseInt(req.params.orderNum);
    
    const deleted = await StoryService.deleteChapterByOrder(storyId, orderNum);
    
    if (!deleted) return res.status(404).json({ success: false, error: "Chapter not found" });
    res.status(200).json({ success: true, message: "Chapter deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const finalizeStoryLinks = (req: any, stories: any[]) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return stories.map(s => ({
    ...s,
    coverLink: s.cover_image_path ? `${baseUrl}/assets/images/poster/stories/${s.cover_image_path}` : null,
    authorAvatarLink: s.authorAvatarUrl ? `${baseUrl}${s.authorAvatarUrl}` : null
  }));
};