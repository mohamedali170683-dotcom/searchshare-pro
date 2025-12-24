import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Generate JWT token
 */
function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', asyncHandler(async (req, res) => {
  // Validate input
  const result = signupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors
    });
  }

  const { email, password, name } = result.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  });

  // Generate token
  const token = generateToken(user.id);

  res.status(201).json({
    message: 'Account created successfully',
    user,
    token
  });
}));

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
router.post('/login', asyncHandler(async (req, res) => {
  // Validate input
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors
    });
  }

  const { email, password } = result.data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Generate token
  const token = generateToken(user.id);

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    },
    token
  });
}));

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      hasApiCredentials: !!(req.user.dataForSeoLogin && req.user.dataForSeoPassword),
      createdAt: req.user.createdAt
    }
  });
}));

/**
 * PUT /api/auth/me
 * Update user profile
 */
router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const { name } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  });

  res.json({ user });
}));

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Hash and update new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash }
  });

  res.json({ message: 'Password updated successfully' });
}));

/**
 * PUT /api/auth/api-credentials
 * Update DataForSEO API credentials
 */
router.put('/api-credentials', authenticate, asyncHandler(async (req, res) => {
  const { apiLogin, apiPassword } = req.body;

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      dataForSeoLogin: apiLogin || null,
      dataForSeoPassword: apiPassword || null
    }
  });

  res.json({
    message: 'API credentials updated',
    hasCredentials: !!(apiLogin && apiPassword)
  });
}));

export default router;
