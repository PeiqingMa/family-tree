import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

// GET /api/users - list all users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const users = await db('users').select('id', 'username', 'role', 'created_at');

    res.json(
      users.map((u: any) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.created_at,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/users/:id/role - change user role
router.put('/:id/role', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "user" or "admin"' });
    }

    const user = await db('users').where('id', req.params.id).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db('users').where('id', req.params.id).update({ role });

    res.json({
      id: user.id,
      username: user.username,
      role,
      createdAt: user.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// DELETE /api/users/:id - delete a user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const user = await db('users').where('id', req.params.id).first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (req.user && req.user.userId === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await db('users').where('id', req.params.id).delete();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
