import express, { Express, Request, Response } from 'express';
import http = require('http');
import { Server } from 'socket.io';
import { pool } from './config/dbConfig';
import jwt from 'jsonwebtoken';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const app: Express = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'a_strong_default_secret_string';


const userSocketMap = new Map<number, string>();

app.use(express.json());

const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (error: any, user: any) => {
        if (error) {
            return res.status(401).json({ error: 'Forbidden: Invalid token' });
        }
        (req as any).user = user;
        next();
    });
};

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

export default app;