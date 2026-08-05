import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { initializeDatabase, closeDatabase } from '../src/database';

const JWT_SECRET = process.env.JWT_SECRET || 'family-tree-secret-key';
const authToken = jwt.sign(
  { userId: 'test-user-id', username: 'testuser', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Persons API', () => {
  beforeAll(async () => {
    await initializeDatabase(':memory:');
  });

  afterAll(async () => {
    await closeDatabase();
  });

  let createdPersonId: string;

  it('POST /api/persons - should create a person', async () => {
    const response = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [
          {
            familyName: 'Smith',
            givenName: 'John',
            fullName: 'John Smith',
            nameOrder: 'GivenNameFirst',
          },
        ],
        bioGender: 'Male',
        socialGender: 'Male',
        lifeFrom: '1990-01-15',
        birthPlace: 'New York',
        details: 'Test person',
        photos: ['https://example.com/photo.jpg'],
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.names).toHaveLength(1);
    expect(response.body.names[0].familyName).toBe('Smith');
    expect(response.body.names[0].givenName).toBe('John');
    expect(response.body.bioGender).toBe('Male');
    expect(response.body.lifeFrom).toBe('1990-01-15');
    expect(response.body.birthPlace).toBe('New York');
    expect(response.body.photos).toEqual(['https://example.com/photo.jpg']);

    createdPersonId = response.body.id;
  });

  it('GET /api/persons - should list all persons', async () => {
    const response = await request(app).get('/api/persons');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);

    const person = response.body.find((p: any) => p.id === createdPersonId);
    expect(person).toBeDefined();
    expect(person.names[0].familyName).toBe('Smith');
  });

  it('GET /api/persons/:id - should return person with details', async () => {
    const response = await request(app).get(`/api/persons/${createdPersonId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdPersonId);
    expect(response.body.names[0].familyName).toBe('Smith');
    expect(response.body.bioGender).toBe('Male');
    expect(response.body).toHaveProperty('parents');
    expect(response.body).toHaveProperty('spouses');
    expect(response.body).toHaveProperty('children');
  });

  it('GET /api/persons/:id - should return 404 for non-existent person', async () => {
    const response = await request(app).get('/api/persons/non-existent-id');
    expect(response.status).toBe(404);
  });

  it('PUT /api/persons/:id - should update person properties', async () => {
    const response = await request(app)
      .put(`/api/persons/${createdPersonId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lifeEnd: '2050-12-31',
        deathPlace: 'Los Angeles',
        names: [
          {
            familyName: 'Smith',
            givenName: 'Jonathan',
            fullName: 'Jonathan Smith',
            nameOrder: 'GivenNameFirst',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.lifeEnd).toBe('2050-12-31');
    expect(response.body.deathPlace).toBe('Los Angeles');
    expect(response.body.names[0].givenName).toBe('Jonathan');
  });

  it('PUT /api/persons/:id - should return 404 for non-existent person', async () => {
    const response = await request(app)
      .put('/api/persons/non-existent-id')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bioGender: 'Female' });

    expect(response.status).toBe(404);
  });

  it('POST /api/persons - should create a person with minimal data', async () => {
    const response = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'Doe', givenName: 'Jane', fullName: 'Jane Doe' }],
      });

    expect(response.status).toBe(201);
    expect(response.body.names[0].familyName).toBe('Doe');
  });

  it('POST /api/persons - should return 400 when no names provided', async () => {
    const response = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('At least one name is required');
  });

  it('POST /api/persons - should return 400 when names array is empty', async () => {
    const response = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ names: [] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('At least one name is required');
  });

  it('POST /api/persons - should return 400 when names have no givenName or familyName', async () => {
    const response = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ names: [{ middleName: 'Only' }] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('At least one name must have a givenName or familyName');
  });

  it('DELETE /api/persons/:id - should delete a person', async () => {
    // Create a person to delete
    const createRes = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'ToDelete', givenName: 'Person', fullName: 'Person ToDelete' }],
      });

    const personId = createRes.body.id;

    const deleteRes = await request(app)
      .delete(`/api/persons/${personId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(deleteRes.status).toBe(204);

    // Verify person is gone
    const getRes = await request(app).get(`/api/persons/${personId}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /api/persons/:id - should return 404 for non-existent person', async () => {
    const response = await request(app)
      .delete('/api/persons/non-existent-id')
      .set('Authorization', `Bearer ${authToken}`);
    expect(response.status).toBe(404);
  });

  it('POST /api/persons - should return 401 without auth token', async () => {
    const response = await request(app)
      .post('/api/persons')
      .send({
        names: [{ familyName: 'NoAuth', givenName: 'Test', fullName: 'Test NoAuth' }],
      });

    expect(response.status).toBe(401);
  });
});
