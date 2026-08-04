import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { Person, PersonCreate, PersonName, PersonSummary, PersonUpdate, RelationView } from '../models/person';

const router = Router();

// GET /api/persons - list all persons with their names
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const persons = await db('persons').select('*');
    const result: Person[] = [];

    for (const p of persons) {
      const names = await db('person_names').where('person_id', p.id);
      result.push({
        id: p.id,
        names: names.map(mapNameRow),
        bioGender: p.bio_gender || undefined,
        socialGender: p.social_gender || undefined,
        lifeFrom: p.life_from || undefined,
        lifeEnd: p.life_end || undefined,
        birthPlace: p.birth_place || undefined,
        deathPlace: p.death_place || undefined,
        details: p.details || undefined,
        photos: p.photos ? JSON.parse(p.photos) : undefined,
        createdAt: p.created_at || undefined,
        updatedAt: p.updated_at || undefined,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch persons' });
  }
});

// GET /api/persons/:id - get person with full details including relations
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const person = await db('persons').where('id', req.params.id).first();

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const names = await db('person_names').where('person_id', person.id);
    const relations = await db('relations')
      .where('from_person_id', person.id)
      .orWhere('to_person_id', person.id);

    const parents: RelationView[] = [];
    const children: RelationView[] = [];
    const spouses: RelationView[] = [];

    for (const rel of relations) {
      let relatedPersonId: string;
      let relationType = rel.relation_type;

      if (rel.from_person_id === person.id) {
        relatedPersonId = rel.to_person_id;
      } else {
        relatedPersonId = rel.from_person_id;
        // Flip relation type when viewing from the other side
        if (relationType === 'parent') {
          relationType = 'child';
        } else if (relationType === 'child') {
          relationType = 'parent';
        }
      }

      const relatedPerson = await db('persons').where('id', relatedPersonId).first();
      if (!relatedPerson) continue;

      const relatedNames = await db('person_names').where('person_id', relatedPersonId);
      const personSummary: PersonSummary = {
        id: relatedPerson.id,
        names: relatedNames.map(mapNameRow),
        bioGender: relatedPerson.bio_gender || undefined,
      };

      const relationView: RelationView = {
        relationId: rel.id,
        person: personSummary,
        relationType: relationType,
        subType: rel.sub_type || undefined,
        spouseFrom: rel.spouse_from || undefined,
        spouseEnd: rel.spouse_end || undefined,
      };

      if (relationType === 'parent') {
        parents.push(relationView);
      } else if (relationType === 'child') {
        children.push(relationView);
      } else if (relationType === 'spouse') {
        spouses.push(relationView);
      }
    }

    const result: Person = {
      id: person.id,
      names: names.map(mapNameRow),
      bioGender: person.bio_gender || undefined,
      socialGender: person.social_gender || undefined,
      lifeFrom: person.life_from || undefined,
      lifeEnd: person.life_end || undefined,
      birthPlace: person.birth_place || undefined,
      deathPlace: person.death_place || undefined,
      details: person.details || undefined,
      photos: person.photos ? JSON.parse(person.photos) : undefined,
      createdAt: person.created_at || undefined,
      updatedAt: person.updated_at || undefined,
      parents,
      spouses,
      children,
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

// POST /api/persons - create a new person
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const body: PersonCreate = req.body;

    // Validate that at least one name with givenName or familyName is provided
    if (!body.names || !Array.isArray(body.names) || body.names.length === 0) {
      return res.status(400).json({ error: 'At least one name is required' });
    }
    const hasValidName = body.names.some(
      (n) => (n.givenName && n.givenName.trim() !== '') || (n.familyName && n.familyName.trim() !== '')
    );
    if (!hasValidName) {
      return res.status(400).json({ error: 'At least one name must have a givenName or familyName' });
    }

    const personId = uuidv4();
    const now = new Date().toISOString();

    await db('persons').insert({
      id: personId,
      bio_gender: body.bioGender || null,
      social_gender: body.socialGender || null,
      life_from: body.lifeFrom || null,
      life_end: body.lifeEnd || null,
      birth_place: body.birthPlace || null,
      death_place: body.deathPlace || null,
      details: body.details || null,
      photos: body.photos ? JSON.stringify(body.photos) : null,
      created_at: now,
      updated_at: now,
    });

    if (body.names && body.names.length > 0) {
      for (const name of body.names) {
        await db('person_names').insert({
          id: uuidv4(),
          person_id: personId,
          family_name: name.familyName || null,
          given_name: name.givenName || null,
          middle_name: name.middleName || null,
          full_name: name.fullName || null,
          name_type: name.nameType || null,
          name_order: name.nameOrder || 'FamilyNameFirst',
        });
      }
    }

    const names = await db('person_names').where('person_id', personId);
    const result: Person = {
      id: personId,
      names: names.map(mapNameRow),
      bioGender: body.bioGender || undefined,
      socialGender: body.socialGender || undefined,
      lifeFrom: body.lifeFrom || undefined,
      lifeEnd: body.lifeEnd || undefined,
      birthPlace: body.birthPlace || undefined,
      deathPlace: body.deathPlace || undefined,
      details: body.details || undefined,
      photos: body.photos || undefined,
      createdAt: now,
      updatedAt: now,
    };

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// PUT /api/persons/:id - update person properties
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const body: PersonUpdate = req.body;
    const person = await db('persons').where('id', req.params.id).first();

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const now = new Date().toISOString();
    await db('persons').where('id', req.params.id).update({
      bio_gender: body.bioGender !== undefined ? body.bioGender : person.bio_gender,
      social_gender: body.socialGender !== undefined ? body.socialGender : person.social_gender,
      life_from: body.lifeFrom !== undefined ? body.lifeFrom : person.life_from,
      life_end: body.lifeEnd !== undefined ? body.lifeEnd : person.life_end,
      birth_place: body.birthPlace !== undefined ? body.birthPlace : person.birth_place,
      death_place: body.deathPlace !== undefined ? body.deathPlace : person.death_place,
      details: body.details !== undefined ? body.details : person.details,
      photos: body.photos !== undefined ? JSON.stringify(body.photos) : person.photos,
      updated_at: now,
    });

    // If names are provided, replace all names
    if (body.names !== undefined) {
      await db('person_names').where('person_id', req.params.id).delete();
      for (const name of body.names) {
        await db('person_names').insert({
          id: uuidv4(),
          person_id: req.params.id,
          family_name: name.familyName || null,
          given_name: name.givenName || null,
          middle_name: name.middleName || null,
          full_name: name.fullName || null,
          name_type: name.nameType || null,
          name_order: name.nameOrder || 'FamilyNameFirst',
        });
      }
    }

    const updatedPerson = await db('persons').where('id', req.params.id).first();
    const names = await db('person_names').where('person_id', req.params.id);

    const result: Person = {
      id: updatedPerson.id,
      names: names.map(mapNameRow),
      bioGender: updatedPerson.bio_gender || undefined,
      socialGender: updatedPerson.social_gender || undefined,
      lifeFrom: updatedPerson.life_from || undefined,
      lifeEnd: updatedPerson.life_end || undefined,
      birthPlace: updatedPerson.birth_place || undefined,
      deathPlace: updatedPerson.death_place || undefined,
      details: updatedPerson.details || undefined,
      photos: updatedPerson.photos ? JSON.parse(updatedPerson.photos) : undefined,
      createdAt: updatedPerson.created_at || undefined,
      updatedAt: updatedPerson.updated_at || undefined,
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// DELETE /api/persons/:id - delete person and associated relations
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const person = await db('persons').where('id', req.params.id).first();

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Delete relations (both directions)
    await db('relations')
      .where('from_person_id', req.params.id)
      .orWhere('to_person_id', req.params.id)
      .delete();

    // Delete names (cascade should handle, but explicit is safer)
    await db('person_names').where('person_id', req.params.id).delete();

    // Delete person
    await db('persons').where('id', req.params.id).delete();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

function mapNameRow(row: any): PersonName {
  return {
    id: row.id,
    personId: row.person_id,
    familyName: row.family_name || undefined,
    givenName: row.given_name || undefined,
    middleName: row.middle_name || undefined,
    fullName: row.full_name || undefined,
    nameType: row.name_type || undefined,
    nameOrder: row.name_order || 'FamilyNameFirst',
  };
}

export default router;
