import express, { Express } from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { config as dotenvConfig } from 'dotenv';
import cors from 'cors';

import authRoutes from './routes/auth.route';
import userRoutes from './routes/user.route';
import storyRoutes from './routes/story.route';
import { errorHandler } from './middlewares/error.middleware';

dotenvConfig();

const app: Express = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/stories', storyRoutes);

app.get('/', (req, res) => {
    res.send('Chilling Stories SQL API is running 🚀');
});

app.use(errorHandler);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

export { app, io };