// src/routes/story.route.ts
import { Router } from 'express';
import * as StoryController from '../controllers/story.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { chapterUpload, posterUpload } from '../middlewares/upload.middleware';

const router = Router();

/**
 * @route   POST /api/stories
 * @desc    Create story metadata and upload poster image
 * @access  Private (Author/Admin)
 */
router.post(
  '/', 
  authenticateToken, 
  authorize(['author', 'admin']), 
  posterUpload.single('poster'), // Expects an image file with key 'poster'
  StoryController.createStory
);

/**
 * @route   GET /api/stories
 * @desc    Search stories (Uses FULLTEXT index)
 * @access  Public
 */
router.get('/', StoryController.getAllStories);

/**
 * @route   POST /api/stories/upload-chapters
 * @desc    Upload multiple .txt/.md files as chapters
 * @access  Private (Author/Admin)
 */
router.post(
  '/upload-chapters',
  authenticateToken,
  authorize(['author', 'admin']),
  chapterUpload.array('chapters', 50),
  StoryController.addChaptersFromFiles
);

/**
 * @route   GET /api/stories/:storyId/chapters
 * @desc    Get all chapters and increment view count
 * @access  Public
 */
router.get('/:storyId/chapters', StoryController.getStoryChapters);

/**
 * @route   GET /api/stories/:storyId/info
 * @desc    Get story metadata only (no chapters)
 * @access  Public
 */
router.get('/:storyId/info', StoryController.getStoryInfo);

/**
 * @route   GET /api/stories/chapters/:chapterId
 * @desc    Get full content of a specific chapter
 * @access  Public
 */
router.get('/chapters/:chapterId', StoryController.getChapterContent);

/**
 * @route   GET /api/stories/:storyId/chapters/:orderNum
 * @desc    Get chapter content by story ID and chapter number
 * @access  Public
 */
router.get('/:storyId/chapters/:orderNum', StoryController.getChapterByNumber);

export default router;