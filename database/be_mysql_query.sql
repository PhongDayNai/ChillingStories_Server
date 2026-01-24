CREATE DATABASE IF NOT EXISTS chilling_stories_db;
USE chilling_stories_db;

-- 1. Users: Handles Authentication and Roles
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'author', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stories: Metadata and Poster Location
CREATE TABLE stories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    poster_filename VARCHAR(255), -- Stores only the filename (e.g., "story1.jpg")
    author_id INT,
    status ENUM('ongoing', 'completed') DEFAULT 'ongoing',
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    FULLTEXT(title, description) -- Enables fast keyword searching
);

-- 3. Chapters: The Heavy Text Content
CREATE TABLE chapters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    story_id INT NOT NULL,
    order_num INT NOT NULL, -- Logical order: 1, 2, 3...
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL, -- Holds up to 4GB of text
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_chapter_order (story_id, order_num)
);

-- 4. Reading Progress: Tracks user bookmarks
CREATE TABLE reading_progress (
    user_id INT NOT NULL,
    story_id INT NOT NULL,
    last_chapter_id INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, story_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);