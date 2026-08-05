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

describe('Relations API', () => {
  beforeAll(async () => {
    await initializeDatabase(':memory:');
  });

  afterAll(async () => {
    await closeDatabase();
  });

  let personAId: string;
  let personBId: string;
  let personCId: string;
  let relationId: string;

  beforeAll(async () => {
    // Create test persons
    const resA = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'Wang', givenName: 'Wei', fullName: 'Wang Wei' }],
        bioGender: 'Male',
        lifeFrom: '1960-05-20',
      });
    personAId = resA.body.id;

    const resB = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'Li', givenName: 'Mei', fullName: 'Li Mei' }],
        bioGender: 'Female',
        lifeFrom: '1962-08-10',
      });
    personBId = resB.body.id;

    const resC = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'Wang', givenName: 'Jun', fullName: 'Wang Jun' }],
        bioGender: 'Male',
        lifeFrom: '1990-03-15',
      });
    personCId = resC.body.id;
  });

  it('POST /api/relations - should create a parent relation', async () => {
    // C's parent is A (Wang Jun's parent is Wang Wei)
    const response = await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: personCId,
        toPersonId: personAId,
        relationType: 'parent',
        subType: 'BioFather',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.fromPersonId).toBe(personCId);
    expect(response.body.toPersonId).toBe(personAId);
    expect(response.body.relationType).toBe('parent');
    expect(response.body.subType).toBe('BioFather');

    relationId = response.body.id;
  });

  it('POST /api/relations - should create a child relation', async () => {
    // A's child is C (Wang Wei's child is Wang Jun)
    const response = await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: personAId,
        toPersonId: personCId,
        relationType: 'child',
        subType: 'Bio',
      });

    expect(response.status).toBe(201);
    expect(response.body.relationType).toBe('child');
    expect(response.body.subType).toBe('Bio');
  });

  it('POST /api/relations - should create a spouse relation', async () => {
    const response = await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: personAId,
        toPersonId: personBId,
        relationType: 'spouse',
        spouseFrom: '1988-06-15',
      });

    expect(response.status).toBe(201);
    expect(response.body.relationType).toBe('spouse');
    expect(response.body.spouseFrom).toBe('1988-06-15');
  });

  it('POST /api/relations - should return 404 for non-existent person', async () => {
    const response = await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: 'non-existent',
        toPersonId: personAId,
        relationType: 'parent',
      });

    expect(response.status).toBe(404);
  });

  it('POST /api/relations - should return 400 for invalid relation type', async () => {
    const response = await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: personAId,
        toPersonId: personBId,
        relationType: 'invalid',
      });

    expect(response.status).toBe(400);
  });

  it('POST /api/relations - should return 409 for duplicate relation', async () => {
    // Create a relation
    const first = await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: personBId,
        toPersonId: personAId,
        relationType: 'spouse',
      });
    expect(first.status).toBe(201);

    // Try to create the same relation again
    const duplicate = await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: personBId,
        toPersonId: personAId,
        relationType: 'spouse',
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe('This relation already exists');
  });

  it('GET /api/persons/:id - should return person with relations populated', async () => {
    const response = await request(app).get(`/api/persons/${personCId}`);

    expect(response.status).toBe(200);
    expect(response.body.parents.length).toBeGreaterThanOrEqual(1);

    const parentRelation = response.body.parents.find(
      (r: any) => r.person.id === personAId
    );
    expect(parentRelation).toBeDefined();
    expect(parentRelation.person.names[0].familyName).toBe('Wang');
  });

  it('POST /api/relations/with-person - should create a new person with relation', async () => {
    const response = await request(app)
      .post('/api/relations/with-person')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        existingPersonId: personCId,
        relationType: 'parent',
        subType: 'BioMother',
        newPerson: {
          names: [{ familyName: 'Li', givenName: 'Hua', fullName: 'Li Hua' }],
          bioGender: 'Female',
          lifeFrom: '1963-01-01',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.person).toHaveProperty('id');
    expect(response.body.person.names[0].familyName).toBe('Li');
    expect(response.body.relation.relationType).toBe('parent');
    expect(response.body.relation.subType).toBe('BioMother');
  });

  it('DELETE /api/relations/:id - should delete a relation', async () => {
    const response = await request(app)
      .delete(`/api/relations/${relationId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(response.status).toBe(204);
  });

  it('DELETE /api/relations/:id - should return 404 for non-existent relation', async () => {
    const response = await request(app)
      .delete('/api/relations/non-existent-id')
      .set('Authorization', `Bearer ${authToken}`);
    expect(response.status).toBe(404);
  });

  it('DELETE /api/persons/:id - should also delete associated relations', async () => {
    // Create a person and relation
    const personRes = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'Test', givenName: 'Delete', fullName: 'Test Delete' }],
      });
    const testPersonId = personRes.body.id;

    await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: testPersonId,
        toPersonId: personAId,
        relationType: 'child',
        subType: 'Adopted',
      });

    // Delete the person
    await request(app)
      .delete(`/api/persons/${testPersonId}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Verify relations are gone - person A should not have relation to deleted person
    const personARes = await request(app).get(`/api/persons/${personAId}`);
    const hasDeletedRelation = [
      ...personARes.body.parents,
      ...personARes.body.children,
      ...personARes.body.spouses,
    ].some((r: any) => r.person.id === testPersonId);

    expect(hasDeletedRelation).toBe(false);
  });

  it('POST /api/relations - should return 401 without auth token', async () => {
    const response = await request(app)
      .post('/api/relations')
      .send({
        fromPersonId: personAId,
        toPersonId: personBId,
        relationType: 'spouse',
      });

    expect(response.status).toBe(401);
  });
});

describe('Tree API', () => {
  beforeAll(async () => {
    await initializeDatabase(':memory:');
  });

  afterAll(async () => {
    await closeDatabase();
  });

  let grandparentId: string;
  let parentId: string;
  let childId: string;
  let grandchildId: string;

  beforeAll(async () => {
    // Create a family: grandparent -> parent -> child -> grandchild
    const gp = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'Zhang', givenName: 'Yi', fullName: 'Zhang Yi' }],
        bioGender: 'Male',
      });
    grandparentId = gp.body.id;

    const p = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'Zhang', givenName: 'Er', fullName: 'Zhang Er' }],
        bioGender: 'Male',
      });
    parentId = p.body.id;

    const c = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'Zhang', givenName: 'San', fullName: 'Zhang San' }],
        bioGender: 'Male',
      });
    childId = c.body.id;

    const gc = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        names: [{ familyName: 'Zhang', givenName: 'Si', fullName: 'Zhang Si' }],
        bioGender: 'Male',
      });
    grandchildId = gc.body.id;

    // parent's parent is grandparent
    await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: parentId,
        toPersonId: grandparentId,
        relationType: 'parent',
        subType: 'BioFather',
      });

    // child's parent is parent
    await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: childId,
        toPersonId: parentId,
        relationType: 'parent',
        subType: 'BioFather',
      });

    // grandchild's parent is child
    await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: grandchildId,
        toPersonId: childId,
        relationType: 'parent',
        subType: 'BioFather',
      });

    // grandparent's child is parent
    await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: grandparentId,
        toPersonId: parentId,
        relationType: 'child',
        subType: 'Bio',
      });

    // parent's child is child
    await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: parentId,
        toPersonId: childId,
        relationType: 'child',
        subType: 'Bio',
      });

    // child's child is grandchild
    await request(app)
      .post('/api/relations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromPersonId: childId,
        toPersonId: grandchildId,
        relationType: 'child',
        subType: 'Bio',
      });
  });

  it('GET /api/tree/ancestors/:id - should return recursive ancestors', async () => {
    const response = await request(app).get(`/api/tree/ancestors/${childId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(childId);
    expect(response.body.names[0].givenName).toBe('San');

    // Should have parent as ancestor
    expect(response.body.ancestors).toBeDefined();
    expect(response.body.ancestors.length).toBe(1);
    expect(response.body.ancestors[0].id).toBe(parentId);

    // Should have grandparent as ancestor of parent
    expect(response.body.ancestors[0].ancestors).toBeDefined();
    expect(response.body.ancestors[0].ancestors.length).toBe(1);
    expect(response.body.ancestors[0].ancestors[0].id).toBe(grandparentId);
  });

  it('GET /api/tree/descendants/:id - should return recursive descendants', async () => {
    const response = await request(app).get(`/api/tree/descendants/${parentId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(parentId);
    expect(response.body.names[0].givenName).toBe('Er');

    // Should have child as descendant
    expect(response.body.descendants).toBeDefined();
    expect(response.body.descendants.length).toBe(1);
    expect(response.body.descendants[0].id).toBe(childId);

    // Should have grandchild as descendant of child
    expect(response.body.descendants[0].descendants).toBeDefined();
    expect(response.body.descendants[0].descendants.length).toBe(1);
    expect(response.body.descendants[0].descendants[0].id).toBe(grandchildId);
  });

  it('GET /api/tree/ancestors/:id - should return 404 for non-existent person', async () => {
    const response = await request(app).get('/api/tree/ancestors/non-existent');
    expect(response.status).toBe(404);
  });

  it('GET /api/tree/descendants/:id - should return 404 for non-existent person', async () => {
    const response = await request(app).get('/api/tree/descendants/non-existent');
    expect(response.status).toBe(404);
  });

  it('GET /api/tree/graph - should return all persons and relations', async () => {
    const response = await request(app).get('/api/tree/graph');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('nodes');
    expect(response.body).toHaveProperty('edges');
    expect(response.body.nodes.length).toBe(4);
    expect(response.body.edges.length).toBe(6);

    // Check that nodes have proper structure
    const node = response.body.nodes.find((n: any) => n.id === grandparentId);
    expect(node).toBeDefined();
    expect(node.names[0].givenName).toBe('Yi');

    // Check that edges have proper structure
    const edge = response.body.edges.find(
      (e: any) => e.fromPersonId === childId && e.toPersonId === parentId
    );
    expect(edge).toBeDefined();
    expect(edge.relationType).toBe('parent');
  });
});
