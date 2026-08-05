import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database';
import { LoginData, UserCreate, AuthPayload } from '../models/user';
import { requireAuth, JWT_SECRET } from '../middleware/auth';

const router = Router();

// POST /api/auth/register - create a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const body: UserCreate = req.body;

    if (!body.username || !body.password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (body.username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (body.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const existing = await db('users').where('username', body.username).first();
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    await db('users').insert({
      id: userId,
      username: body.username,
      password_hash: passwordHash,
      role: 'user',
      created_at: now,
    });

    const payload: AuthPayload = {
      userId,
      username: body.username,
      role: 'user',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: {
        id: userId,
        username: body.username,
        role: 'user',
        createdAt: now,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login - authenticate user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const body: LoginData = req.body;

    if (!body.username || !body.password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db('users').where('username', body.username).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(body.password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const payload: AuthPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/me - get current user info
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const user = await db('users').where('id', req.user!.userId).first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// POST /api/auth/change-password - change the current user's password
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await db('users').where('id', req.user!.userId).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db('users').where('id', req.user!.userId).update({
      password_hash: newPasswordHash,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
