import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { Relation, RelationCreate, RelationWithPersonCreate } from '../models/relation';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /api/relations - create a relation between two existing persons
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const body: RelationCreate = req.body;

    // Validate both persons exist
    const fromPerson = await db('persons').where('id', body.fromPersonId).first();
    const toPerson = await db('persons').where('id', body.toPersonId).first();

    if (!fromPerson) {
      return res.status(404).json({ error: 'From person not found' });
    }
    if (!toPerson) {
      return res.status(404).json({ error: 'To person not found' });
    }

    const validTypes = ['parent', 'child', 'spouse'];
    if (!validTypes.includes(body.relationType)) {
      return res.status(400).json({ error: 'Invalid relation type. Must be parent, child, or spouse.' });
    }

    // Check for duplicate relation
    const existingRelation = await db('relations')
      .where('from_person_id', body.fromPersonId)
      .andWhere('to_person_id', body.toPersonId)
      .andWhere('relation_type', body.relationType)
      .first();

    if (existingRelation) {
      return res.status(409).json({ error: 'This relation already exists' });
    }

    const relationId = uuidv4();
    const now = new Date().toISOString();

    await db('relations').insert({
      id: relationId,
      from_person_id: body.fromPersonId,
      to_person_id: body.toPersonId,
      relation_type: body.relationType,
      sub_type: body.subType || null,
      spouse_from: body.spouseFrom || null,
      spouse_end: body.spouseEnd || null,
      created_at: now,
    });

    const result: Relation = {
      id: relationId,
      fromPersonId: body.fromPersonId,
      toPersonId: body.toPersonId,
      relationType: body.relationType,
      subType: body.subType || undefined,
      spouseFrom: body.spouseFrom || undefined,
      spouseEnd: body.spouseEnd || undefined,
      createdAt: now,
    };

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create relation' });
  }
});

// POST /api/relations/with-person - create a new person and relate them to an existing person
router.post('/with-person', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const body: RelationWithPersonCreate = req.body;

    // Validate existing person
    const existingPerson = await db('persons').where('id', body.existingPersonId).first();
    if (!existingPerson) {
      return res.status(404).json({ error: 'Existing person not found' });
    }

    const validTypes = ['parent', 'child', 'spouse'];
    if (!validTypes.includes(body.relationType)) {
      return res.status(400).json({ error: 'Invalid relation type. Must be parent, child, or spouse.' });
    }

    // Create the new person
    const newPersonId = uuidv4();
    const now = new Date().toISOString();

    await db('persons').insert({
      id: newPersonId,
      bio_gender: body.newPerson.bioGender || null,
      social_gender: body.newPerson.socialGender || null,
      life_from: body.newPerson.lifeFrom || null,
      life_end: body.newPerson.lifeEnd || null,
      birth_place: body.newPerson.birthPlace || null,
      death_place: body.newPerson.deathPlace || null,
      details: body.newPerson.details || null,
      photos: body.newPerson.photos ? JSON.stringify(body.newPerson.photos) : null,
      created_at: now,
      updated_at: now,
    });

    if (body.newPerson.names && body.newPerson.names.length > 0) {
      for (const name of body.newPerson.names) {
        await db('person_names').insert({
          id: uuidv4(),
          person_id: newPersonId,
          family_name: name.familyName || null,
          given_name: name.givenName || null,
          middle_name: name.middleName || null,
          full_name: name.fullName || null,
          name_type: name.nameType || null,
          name_order: name.nameOrder || 'FamilyNameFirst',
        });
      }
    }

    // Create the relation
    const relationId = uuidv4();

    // Determine direction: the existing person is "from", new person is "to"
    await db('relations').insert({
      id: relationId,
      from_person_id: body.existingPersonId,
      to_person_id: newPersonId,
      relation_type: body.relationType,
      sub_type: body.subType || null,
      spouse_from: body.spouseFrom || null,
      spouse_end: body.spouseEnd || null,
      created_at: now,
    });

    // Return the new person with relation info
    const names = await db('person_names').where('person_id', newPersonId);
    res.status(201).json({
      person: {
        id: newPersonId,
        names: names.map((n: any) => ({
          id: n.id,
          personId: n.person_id,
          familyName: n.family_name || undefined,
          givenName: n.given_name || undefined,
          middleName: n.middle_name || undefined,
          fullName: n.full_name || undefined,
          nameType: n.name_type || undefined,
          nameOrder: n.name_order || 'FamilyNameFirst',
        })),
        bioGender: body.newPerson.bioGender || undefined,
        socialGender: body.newPerson.socialGender || undefined,
        lifeFrom: body.newPerson.lifeFrom || undefined,
        lifeEnd: body.newPerson.lifeEnd || undefined,
        birthPlace: body.newPerson.birthPlace || undefined,
        deathPlace: body.newPerson.deathPlace || undefined,
        details: body.newPerson.details || undefined,
        photos: body.newPerson.photos || undefined,
        createdAt: now,
        updatedAt: now,
      },
      relation: {
        id: relationId,
        fromPersonId: body.existingPersonId,
        toPersonId: newPersonId,
        relationType: body.relationType,
        subType: body.subType || undefined,
        spouseFrom: body.spouseFrom || undefined,
        spouseEnd: body.spouseEnd || undefined,
        createdAt: now,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create relation with person' });
  }
});

// DELETE /api/relations/:id - remove a relation
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const relation = await db('relations').where('id', req.params.id).first();

    if (!relation) {
      return res.status(404).json({ error: 'Relation not found' });
    }

    await db('relations').where('id', req.params.id).delete();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete relation' });
  }
});

export default router;
