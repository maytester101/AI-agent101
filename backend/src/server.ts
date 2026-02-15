import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setupRoutes } from './routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup for real-time communication
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup API routes
setupRoutes(app, io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 AI QA Engineer Backend running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🤖 Ollama model: ${process.env.OLLAMA_MODEL || 'deepseek-coder'}`);
});

export { io };
