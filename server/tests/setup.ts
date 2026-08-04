import { initializeDatabase, closeDatabase } from '../src/database';

beforeAll(async () => {
  // Use in-memory database for tests
  await initializeDatabase(':memory:');
});

afterAll(async () => {
  await closeDatabase();
});
