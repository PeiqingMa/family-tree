import express from 'express';
import cors from 'cors';
import path from 'path';
import personsRouter from './routes/persons';
import relationsRouter from './routes/relations';
import treeRouter from './routes/tree';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/persons', personsRouter);
app.use('/api/relations', relationsRouter);
app.use('/api/tree', treeRouter);

// Serve static files in production
const clientBuildPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

// Fallback for SPA routing (in production)
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

export default app;
