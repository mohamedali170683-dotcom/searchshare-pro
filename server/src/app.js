import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/projects.routes.js';
import dataforSeoRoutes from './routes/dataforseo.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/dataforseo', dataforSeoRoutes);

// Dashboard stats endpoint
app.get('/api/dashboard/stats', async (req, res, next) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // This would need auth middleware in production
    const projects = await prisma.project.findMany();

    const stats = {
      totalProjects: projects.length,
      growing: projects.filter(p => p.currentStatus === 'growing').length,
      declining: projects.filter(p => p.currentStatus === 'declining').length,
      neutral: projects.filter(p => p.currentStatus === 'neutral').length
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║     SearchShare Pro API Server               ║
  ║                                              ║
  ║     Running on: http://localhost:${PORT}       ║
  ║     Environment: ${process.env.NODE_ENV || 'development'}             ║
  ╚══════════════════════════════════════════════╝
  `);
});

export default app;
