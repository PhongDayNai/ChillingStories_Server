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
  posterUpload.single('poster'),
  StoryController.createStory
);

/**
 * @route   POST /api/stories
 * @desc    Create story metadata with genres and upload poster image
 * @access  Private (Author/Admin)
 */
router.post(
  '/', 
  authenticateToken, 
  authorize(['author', 'admin']), 
  posterUpload.single('poster'),
  StoryController.createStoryWithGenres
);

/**
 * @route   GET /api/stories
 * @desc    Search stories (Uses FULLTEXT index)
 * @access  Public
 */
router.get('/', StoryController.getAllStories);

/**
 * @route   POST /api/stories/chapters
 * @desc    Upload a single .txt/.md file as a chapter with metadata
 * @access  Private (Author/Admin)
 */
router.post(
  '/upload-chapter',
  authenticateToken,
  authorize(['author', 'admin']),
  chapterUpload.single('chapterFile'),
  StoryController.addSingleChapter
);

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

/**
 * @route   PATCH /api/stories/:storyId/view
 * @desc    Increment story view count
 * @access  Public
 */
router.patch('/:storyId/view', StoryController.addView);

/**
 * @route   POST /api/stories/:storyId/favorite
 * @desc    Toggle favorite (Add if not exists, remove if it does)
 * @access  Private (Authenticated users)
 */
router.post('/:storyId/favorite', authenticateToken, StoryController.toggleFavoriteStatus);

/**
 * @route   PATCH /api/stories/chapters/:chapterId/title
 * @desc    Update a specific chapter's title
 * @access  Private (Author/Admin only)
 */
router.patch(
  '/chapters/:chapterId/title', 
  authenticateToken, 
  authorize(['author', 'admin']), 
  StoryController.updateChapterInfo
);

/**
 * @route   GET /api/stories/genres/all
 * @desc    Get all available genres
 * @access  Public
 */
// router.get('/genres/all', StoryController.fetchAllGenres);

/**
 * @route   PUT /api/stories/:storyId/genres
 * @desc    Update genres for a specific story
 * @access  Private (Author/Admin)
 */
router.put(
  '/:storyId/genres', 
  authenticateToken, 
  authorize(['author', 'admin']), 
  StoryController.updateGenres
);

/**
 * @route   GET /api/stories/top/new
 * @desc    Get 30 most recently created stories
 * @access  Public
 */
router.get('/top/new', StoryController.getTopNew);

/**
 * @route   GET /api/stories/top/views
 * @desc    Get top 30 stories by view count
 * @access  Public
 */
router.get('/top/views', StoryController.getTopViewed);

/**
 * @route   GET /api/stories/top/favorites
 * @desc    Get top 30 stories by favorite count
 * @access  Public
 */
router.get('/top/favorites', StoryController.getTopFavorited);

export default router;