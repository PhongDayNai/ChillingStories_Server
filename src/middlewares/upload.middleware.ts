import multer from 'multer';
import path from 'path';
import fs from 'fs';

const avatarDir = path.join(__dirname, '../../assets/images/users/avatars');
const tempUploadDir = path.join(__dirname, '../../assets/temp_uploads');
const posterDir = path.join(__dirname, '../../assets/images/poster/stories');

[avatarDir, tempUploadDir, posterDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => {
        const userId = (req as any).user?.id || 'guest';
        const uniqueSuffix = Date.now();
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar_${userId}_${uniqueSuffix}${extension}`);
    }
});

const avatarFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG and WEBP are allowed for avatars'), false);
    }
};

const chapterStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, tempUploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const chapterFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowedExtensions = ['.txt', '.md'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Only .txt and .md files are allowed'), false);
    }
};

const posterStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, posterDir),
    filename: (req, file, cb) => {
        const storyName = req.body.title 
            ? slugify(req.body.title) 
            : 'story';

        const files = fs.readdirSync(posterDir);
        const pattern = new RegExp(`^${storyName}_(\\d+)\\.`);
        
        let maxCounter = -1;
        files.forEach(f => {
            const match = f.match(pattern);
            if (match) {
                const count = parseInt(match[1]);
                if (count > maxCounter) maxCounter = count;
            }
        });

        const nextCounter = maxCounter + 1;
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `${storyName}_${nextCounter}${extension}`);
    }
});

const posterFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG and WEBP are allowed for posters'), false);
    }
};

export const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: avatarFilter,
    limits: { fileSize: 8 * 1024 * 1024 }
});

export const chapterUpload = multer({
    storage: chapterStorage,
    fileFilter: chapterFilter,
    limits: { fileSize: 20 * 1024 * 1024 }
});

export const posterUpload = multer({
    storage: posterStorage,
    fileFilter: posterFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const slugify = (text: string): string => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[đĐ]/g, 'd')
        .replace(/([^a-z0-0\s_-])+/g, '')
        .replace(/[\s_-]+/g, '_')
        .trim();
};