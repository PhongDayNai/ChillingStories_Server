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
// router.post(
//   '/', 
//   authenticateToken, 
//   authorize(['author', 'admin']), 
//   posterUpload.single('poster'),
//   StoryController.createStory
// );

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
 * @route   PATCH /api/stories/:storyId
 * @desc    Update story metadata (title, description, poster)
 * @access  Private (Author/Admin)
 */
router.patch(
  '/:storyId',
  authenticateToken,
  authorize(['author', 'admin']),
  posterUpload.single('poster'),
  StoryController.updateStoryInfo
);

/**
 * @route   GET /api/stories
 * @desc    Tìm kiếm truyện (Sử dụng FULLTEXT index). 
 * @access  Public / Private (Optional Token)
 */
router.get('/', authenticateToken, StoryController.getAllStories);

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
 * @route   GET /api/stories/:storyId/chapters/:orderNum
 * @desc    Get chapter content by story ID and chapter number
 * @access  Public
 */
router.get('/:storyId/chapters/:orderNum', StoryController.getChapterByNumber);

/**
 * @route   GET /api/stories/personalized/:storyId/chapters/:orderNum
 * @desc    Get chapter content by story ID and chapter number
 * @access  Public
 */
router.get('/personalized/:storyId/chapters/:orderNum', authenticateToken, StoryController.getChapterByNumberForUser);

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
  '/chapters/:chapterId', 
  authenticateToken, 
  authorize(['author', 'admin']), 
  chapterUpload.single('chapterFile'),
  StoryController.updateChapterInfo
);

/**
 * @route   PATCH /api/stories/:storyId/chapters/:orderNum
 * @desc    Update chapter by order number (Title and/or Content file)
 * @access  Private (Author/Admin)
 */
router.patch(
  '/:storyId/chapters/:orderNum',
  authenticateToken,
  authorize(['author', 'admin']),
  chapterUpload.single('chapterFile'),
  StoryController.updateChapterByOrderNum
);

/**
 * @route   GET /api/stories/genres
 * @desc    Get all available genres
 * @access  Public
 */
router.get('/genres/all', StoryController.getAllGenres);

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

/**
 * @route   GET /api/stories/top/new
 * @desc    Lấy danh sách 30 truyện mới nhất. 
 * Trả về đầy đủ thông tin tác giả (tên, avatar), danh sách thể loại và trạng thái yêu thích nếu người dùng đã đăng nhập.
 * @access  Public / Private (Optional Token)
 */
router.get('/top/new', authenticateToken, StoryController.getTopNew);

/**
 * @route   GET /api/stories/top/views
 * @desc    Lấy danh sách 30 truyện có lượt xem cao nhất.
 * Tự động gộp thông tin tác giả và trạng thái cá nhân hóa (isFavorited) dựa trên UserId.
 * @access  Public / Private (Optional Token)
 */
router.get('/top/views', authenticateToken, StoryController.getTopViewed);

/**
 * @route   GET /api/stories/top/favorites
 * @desc    Lấy danh sách 30 truyện có lượt yêu thích cao nhất hệ thống.
 * Dữ liệu bao gồm mảng genres đã được chuẩn hóa từ string sang mảng chuỗi.
 * @access  Public / Private (Optional Token)
 */
router.get('/top/favorites', authenticateToken, StoryController.getTopFavorited);

/**
 * @route   GET /api/stories/author/:userId
 * @desc    Lấy toàn bộ danh sách truyện được sáng tác bởi một tác giả cụ thể.
 * @param   {string} userId - ID của tác giả cần lấy truyện (truyền qua params).
 * @access  Public / Private (Optional Token)
 * @returns {Object} Trả về mảng truyện với cấu trúc đồng nhất như các hàm Top.
 */
router.get('/author/:userId', authenticateToken, StoryController.getStoriesByAuthor);

/**
 * @route   GET /api/stories/me/favorites
 * @desc    Get all stories favorited by the current user
 * @access  Private (Authenticated)
 */
router.get('/me/favorites', authenticateToken, StoryController.getMyFavorites);

/**
 * @route   GET /api/stories/me/progress
 * @desc    Get all reading progress/history for the current user
 * @access  Private (Authenticated)
 */
router.get('/me/progress', authenticateToken, StoryController.getUserReadingHistory);

/**
 * @route   DELETE /api/stories/me/progress/:storyId
 * @desc    Remove a specific story from the user's reading history
 * @access  Private (Authenticated)
 */
router.delete(
  '/me/progress/:storyId', 
  authenticateToken, 
  StoryController.removeFromHistory
);

/**
 * @route   DELETE /api/stories/:storyId
 * @desc    Delete a story and its physical poster file
 */
router.delete('/:storyId', authenticateToken, authorize(['author', 'admin']), StoryController.removeStory);

/**
 * @route   DELETE /api/stories/chapters/:chapterId
 * @desc    Delete a chapter by ID
 */
router.delete('/chapters/:chapterId', authenticateToken, authorize(['author', 'admin']), StoryController.removeChapterById);

/**
 * @route   DELETE /api/stories/:storyId/chapters/:orderNum
 * @desc    Delete a chapter by story ID and order number
 */
router.delete('/:storyId/chapters/:orderNum', authenticateToken, authorize(['author', 'admin']), StoryController.removeChapterByOrder);

export default router;