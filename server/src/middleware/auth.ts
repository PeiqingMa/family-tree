import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../models/user';
import { getDb } from '../database';

const DEFAULT_SECRET = 'family-tree-secret-key';

if (!process.env.JWT_SECRET) {
  console.warn(
    'WARNING: JWT_SECRET environment variable is not set. ' +
    'Using an insecure default secret. ' +
    'Set JWT_SECRET in production to a strong, random value.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;

export { JWT_SECRET };

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload | null;
    }
  }
}

/**
 * Middleware that checks for a Bearer token in the Authorization header.
 * If valid, attaches user info to req.user. If missing or invalid, sets req.user to null.
 * Does NOT reject the request - anonymous access is allowed.
 */
export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.user = null;
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
  } catch {
    req.user = null;
  }

  next();
}

/**
 * Middleware that rejects requests without a valid authenticated user (401).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Middleware that rejects requests from non-admin users (403).
 * Re-validates the user's role from the database to handle role changes
 * that occur after token issuance.
 * Must be used after requireAuth.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    // Re-read role from DB to catch role changes since token was issued
    const db = getDb();
    const user = await db('users').where('id', req.user.userId).first();

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // Update req.user.role with the current DB value
    req.user.role = user.role;
    next();
  } catch {
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
}
