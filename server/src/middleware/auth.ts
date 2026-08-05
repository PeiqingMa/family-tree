import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../models/user';

const JWT_SECRET = process.env.JWT_SECRET || 'family-tree-secret-key';

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
 * Must be used after requireAuth.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
