import express from 'express';
import cors from 'cors';
import path from 'path';
import { authenticateToken } from './middleware/auth';
import personsRouter from './routes/persons';
import relationsRouter from './routes/relations';
import treeRouter from './routes/tree';
import authRouter from './routes/auth';
import usersRouter from './routes/users';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Apply authenticateToken globally - populates req.user if token present
app.use(authenticateToken);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/persons', personsRouter);
app.use('/api/relations', relationsRouter);
app.use('/api/tree', treeRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientBuildPath));

  // Fallback for SPA routing (in production)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

export default app;
