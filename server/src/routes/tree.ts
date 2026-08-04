import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { PersonName } from '../models/person';

const router = Router();

interface TreeNode {
  id: string;
  names: PersonName[];
  bioGender?: string;
  socialGender?: string;
  lifeFrom?: string;
  lifeEnd?: string;
  birthPlace?: string;
  deathPlace?: string;
  ancestors?: TreeNode[];
  descendants?: TreeNode[];
}

// GET /api/tree/ancestors/:id - recursive ancestor traversal
router.get('/ancestors/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const person = await db('persons').where('id', req.params.id).first();

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const result = await buildAncestorTree(req.params.id, new Set());
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ancestors' });
  }
});

// GET /api/tree/descendants/:id - recursive descendant traversal
router.get('/descendants/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const person = await db('persons').where('id', req.params.id).first();

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const result = await buildDescendantTree(req.params.id, new Set());
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch descendants' });
  }
});

// GET /api/tree/graph - return all persons and relations for graph rendering
router.get('/graph', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const persons = await db('persons').select('*');
    const allNames = await db('person_names').select('*');
    const relations = await db('relations').select('*');

    const nodes = persons.map((p: any) => {
      const names = allNames
        .filter((n: any) => n.person_id === p.id)
        .map(mapNameRow);

      return {
        id: p.id,
        names,
        bioGender: p.bio_gender || undefined,
        socialGender: p.social_gender || undefined,
        lifeFrom: p.life_from || undefined,
        lifeEnd: p.life_end || undefined,
        birthPlace: p.birth_place || undefined,
        deathPlace: p.death_place || undefined,
      };
    });

    const edges = relations.map((r: any) => ({
      id: r.id,
      fromPersonId: r.from_person_id,
      toPersonId: r.to_person_id,
      relationType: r.relation_type,
      subType: r.sub_type || undefined,
      spouseFrom: r.spouse_from || undefined,
      spouseEnd: r.spouse_end || undefined,
    }));

    res.json({ nodes, edges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

async function buildAncestorTree(personId: string, visited: Set<string>): Promise<TreeNode | null> {
  if (visited.has(personId)) return null;
  visited.add(personId);

  const db = getDb();
  const person = await db('persons').where('id', personId).first();
  if (!person) return null;

  const names = await db('person_names').where('person_id', personId);

  // Find parent relations where this person is the "from" (child) side
  const parentRelations = await db('relations')
    .where('from_person_id', personId)
    .andWhere('relation_type', 'parent');

  const ancestors: TreeNode[] = [];
  for (const rel of parentRelations) {
    const ancestor = await buildAncestorTree(rel.to_person_id, visited);
    if (ancestor) {
      ancestors.push(ancestor);
    }
  }

  return {
    id: person.id,
    names: names.map(mapNameRow),
    bioGender: person.bio_gender || undefined,
    socialGender: person.social_gender || undefined,
    lifeFrom: person.life_from || undefined,
    lifeEnd: person.life_end || undefined,
    birthPlace: person.birth_place || undefined,
    deathPlace: person.death_place || undefined,
    ancestors: ancestors.length > 0 ? ancestors : undefined,
  };
}

async function buildDescendantTree(personId: string, visited: Set<string>): Promise<TreeNode | null> {
  if (visited.has(personId)) return null;
  visited.add(personId);

  const db = getDb();
  const person = await db('persons').where('id', personId).first();
  if (!person) return null;

  const names = await db('person_names').where('person_id', personId);

  // Find child relations where this person is the "from" (parent) side
  const childRelations = await db('relations')
    .where('from_person_id', personId)
    .andWhere('relation_type', 'child');

  const descendants: TreeNode[] = [];
  for (const rel of childRelations) {
    const descendant = await buildDescendantTree(rel.to_person_id, visited);
    if (descendant) {
      descendants.push(descendant);
    }
  }

  return {
    id: person.id,
    names: names.map(mapNameRow),
    bioGender: person.bio_gender || undefined,
    socialGender: person.social_gender || undefined,
    lifeFrom: person.life_from || undefined,
    lifeEnd: person.life_end || undefined,
    birthPlace: person.birth_place || undefined,
    deathPlace: person.death_place || undefined,
    descendants: descendants.length > 0 ? descendants : undefined,
  };
}

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
