import app from './app';
import { initializeDatabase } from './database';
import path from 'path';
import fs from 'fs';

const PORT = process.env.PORT || 3001;

async function main() {
  // Ensure data directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database
  await initializeDatabase();

  // Start server
  app.listen(PORT, () => {
    console.log(`Family Tree server running on port ${PORT}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
