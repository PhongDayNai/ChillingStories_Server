import express, { Express } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { config as dotenvConfig } from 'dotenv';
import cors from 'cors';

import authRoutes from './routes/auth.route';
import userRoutes from './routes/user.route';
import { errorHandler } from './middlewares/error.middleware';

dotenvConfig();

const app: Express = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Chilling Stories SQL API is running 🚀');
});

app.use(errorHandler);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

export { app, io };