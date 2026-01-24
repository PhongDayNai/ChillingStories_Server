export type StoryStatus = 'ongoing' | 'completed';

export interface IStory {
  id: number;
  title: string;
  description?: string;
  posterFilename?: string;
  authorId?: number;
  status: StoryStatus;
  viewCount: number;
  createdAt: Date;
}

export interface IChapter {
  id: number;
  storyId: number;
  orderNum: number;
  title: string;
  content: string;
  createdAt: Date;
}

export interface IReadingProgress {
  userId: number;
  storyId: number;
  lastChapterId?: number;
  updatedAt: Date;
}

export interface ICreateStoryRequest {
  title: string;
  description?: string;
  posterFilename?: string | null;
}

export interface ICreateChapterRequest {
  storyId: number;
  orderNum: number;
  title: string;
  content: string;
}