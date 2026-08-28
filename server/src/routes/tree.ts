import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { PersonName } from '../models/person';

const router = Router();

/** Maximum number of persons a single neighbourhood response may contain. */
const MAX_NEIGHBOURHOOD_NODES = 400;

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

// GET /api/tree/default-focus - suggest the person the tree should open on.
// Picks the best connected person, preferring the oldest one on ties, so the
// default view lands on someone with an interesting neighbourhood to show.
router.get('/default-focus', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const persons = await db('persons').select('id', 'life_from', 'created_at');
    if (persons.length === 0) {
      return res.json({ id: null });
    }

    const relations = await db('relations').select('from_person_id', 'to_person_id');
    const degree = new Map<string, number>();
    for (const rel of relations) {
      degree.set(rel.from_person_id, (degree.get(rel.from_person_id) || 0) + 1);
      degree.set(rel.to_person_id, (degree.get(rel.to_person_id) || 0) + 1);
    }

    const sorted = [...persons].sort((a: any, b: any) => {
      const degreeDiff = (degree.get(b.id) || 0) - (degree.get(a.id) || 0);
      if (degreeDiff !== 0) return degreeDiff;
      const yearA = a.life_from || '\uffff';
      const yearB = b.life_from || '\uffff';
      if (yearA !== yearB) return yearA < yearB ? -1 : 1;
      const createdA = a.created_at || '';
      const createdB = b.created_at || '';
      if (createdA !== createdB) return createdA < createdB ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });

    res.json({ id: sorted[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to determine default focus' });
  }
});

// GET /api/tree/neighborhood/:id - the graph around one person, bounded by
// generation budgets, ready to be laid out as a generational chart.
//
//   up         how many ancestor generations to include (default 3)
//   down       how many descendant generations to include (default 1)
//   collateral how far to descend again from each included ancestor, which is
//              what brings in siblings (1), cousins/nephews (2), ...
router.get('/neighborhood/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const rootId = req.params.id;
    const root = await db('persons').where('id', rootId).first();
    if (!root) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const up = clampInt(req.query.up, 3, 0, 8);
    const down = clampInt(req.query.down, 1, 0, 8);
    const collateral = clampInt(req.query.collateral, 1, 0, 4);

    const relations = await db('relations').select('*');
    const { parentsOf, childrenOf, spousesOf } = buildAdjacency(relations);

    const { included, truncated } = collectNeighbourhood(
      rootId,
      { up, down, collateral },
      { parentsOf, childrenOf, spousesOf }
    );

    const ids = [...included];
    const persons = await db('persons').whereIn('id', ids).select('*');
    const names = await db('person_names').whereIn('person_id', ids).select('*');

    const namesByPerson = new Map<string, PersonName[]>();
    for (const row of names) {
      const list = namesByPerson.get(row.person_id) || [];
      list.push(mapNameRow(row));
      namesByPerson.set(row.person_id, list);
    }

    const nodes = persons.map((p: any) => mapPersonRow(p, namesByPerson.get(p.id) || []));
    const edges = relations
      .filter((r: any) => included.has(r.from_person_id) && included.has(r.to_person_id))
      .map(mapRelationRow);

    res.json({ rootId, up, down, collateral, truncated, nodes, edges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch neighborhood' });
  }
});

interface Adjacency {
  parentsOf: Map<string, Set<string>>;
  childrenOf: Map<string, Set<string>>;
  spousesOf: Map<string, Set<string>>;
}

/**
 * Relations are stored with a direction plus a type, and the same fact can be
 * recorded either way round:
 *   (from=A, to=B, 'parent') means B is a parent of A
 *   (from=A, to=B, 'child')  means B is a child of A
 *   (from=A, to=B, 'spouse') is symmetric
 * This collapses both encodings into plain adjacency sets.
 */
function buildAdjacency(relations: any[]): Adjacency {
  const parentsOf = new Map<string, Set<string>>();
  const childrenOf = new Map<string, Set<string>>();
  const spousesOf = new Map<string, Set<string>>();

  const link = (map: Map<string, Set<string>>, key: string, value: string) => {
    const set = map.get(key) || new Set<string>();
    set.add(value);
    map.set(key, set);
  };

  for (const rel of relations) {
    const from = rel.from_person_id;
    const to = rel.to_person_id;
    if (!from || !to || from === to) continue;

    if (rel.relation_type === 'spouse') {
      link(spousesOf, from, to);
      link(spousesOf, to, from);
    } else if (rel.relation_type === 'parent') {
      // to is the parent of from
      link(parentsOf, from, to);
      link(childrenOf, to, from);
    } else if (rel.relation_type === 'child') {
      // to is the child of from
      link(parentsOf, to, from);
      link(childrenOf, from, to);
    }
  }

  return { parentsOf, childrenOf, spousesOf };
}

interface Budget {
  up: number;
  down: number;
  collateral: number;
}

/**
 * Breadth-first walk outwards from the root, where every person carries a
 * remaining "how much further may we travel" budget. Budgets are merged with
 * max() so a person reached by several paths keeps the most generous one, which
 * makes the result independent of traversal order.
 */
function collectNeighbourhood(
  rootId: string,
  limits: Budget,
  adjacency: Adjacency
): { included: Set<string>; truncated: boolean } {
  const best = new Map<string, { up: number; down: number }>();
  const queue: Array<{ id: string; up: number; down: number }> = [];
  let truncated = false;

  const push = (id: string, up: number, down: number) => {
    const current = best.get(id);
    if (current && current.up >= up && current.down >= down) return;
    if (!current && best.size >= MAX_NEIGHBOURHOOD_NODES) {
      truncated = true;
      return;
    }
    const merged = {
      up: Math.max(up, current?.up ?? 0),
      down: Math.max(down, current?.down ?? 0),
    };
    best.set(id, merged);
    queue.push({ id, ...merged });
  };

  push(rootId, limits.up, limits.down);

  for (let head = 0; head < queue.length; head += 1) {
    const { id, up, down } = queue[head];
    const stored = best.get(id);
    // A later push already superseded this entry; it will be processed again.
    if (!stored || stored.up !== up || stored.down !== down) continue;

    // Partners always come along - a couple should never be split up - but they
    // do not open up their own ancestry.
    for (const spouseId of adjacency.spousesOf.get(id) || []) {
      push(spouseId, 0, down);
    }

    if (up > 0) {
      for (const parentId of adjacency.parentsOf.get(id) || []) {
        // Descending again from an ancestor is what reveals siblings (and, with
        // a larger collateral budget, cousins and nephews).
        push(parentId, up - 1, limits.collateral);
      }
    }

    if (down > 0) {
      for (const childId of adjacency.childrenOf.get(id) || []) {
        push(childId, 0, down - 1);
      }
    }
  }

  return { included: new Set(best.keys()), truncated };
}

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function mapPersonRow(row: any, names: PersonName[]) {
  let photos: string[] | undefined;
  if (row.photos) {
    try {
      const parsed = JSON.parse(row.photos);
      if (Array.isArray(parsed) && parsed.length > 0) photos = parsed;
    } catch {
      photos = undefined;
    }
  }

  return {
    id: row.id,
    names,
    bioGender: row.bio_gender || undefined,
    socialGender: row.social_gender || undefined,
    lifeFrom: row.life_from || undefined,
    lifeEnd: row.life_end || undefined,
    birthPlace: row.birth_place || undefined,
    deathPlace: row.death_place || undefined,
    photos,
  };
}

function mapRelationRow(row: any) {
  return {
    id: row.id,
    fromPersonId: row.from_person_id,
    toPersonId: row.to_person_id,
    relationType: row.relation_type,
    subType: row.sub_type || undefined,
    spouseFrom: row.spouse_from || undefined,
    spouseEnd: row.spouse_end || undefined,
  };
}

async function buildAncestorTree(personId: string, visited: Set<string>): Promise<TreeNode | null> {
  if (visited.has(personId)) return null;
  visited.add(personId);

  const db = getDb();
  const person = await db('persons').where('id', personId).first();
  if (!person) return null;

  const names = await db('person_names').where('person_id', personId);

  // Find parents via both directions:
  // 1. from_person_id = current person, relation_type = 'parent' (this person declared a parent)
  // 2. to_person_id = current person, relation_type = 'child' (someone declared this person as their child)
  const parentRelations = await db('relations')
    .where(function () {
      this.where('from_person_id', personId).andWhere('relation_type', 'parent');
    })
    .orWhere(function () {
      this.where('to_person_id', personId).andWhere('relation_type', 'child');
    });

  const ancestorIds = new Set<string>();
  const ancestors: TreeNode[] = [];
  for (const rel of parentRelations) {
    const ancestorId = rel.from_person_id === personId ? rel.to_person_id : rel.from_person_id;
    if (ancestorIds.has(ancestorId)) continue;
    ancestorIds.add(ancestorId);
    const ancestor = await buildAncestorTree(ancestorId, visited);
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

  // Find children via both directions:
  // 1. from_person_id = current person, relation_type = 'child' (this person declared a child)
  // 2. to_person_id = current person, relation_type = 'parent' (someone declared this person as their parent)
  const childRelations = await db('relations')
    .where(function () {
      this.where('from_person_id', personId).andWhere('relation_type', 'child');
    })
    .orWhere(function () {
      this.where('to_person_id', personId).andWhere('relation_type', 'parent');
    });

  const descendantIds = new Set<string>();
  const descendants: TreeNode[] = [];
  for (const rel of childRelations) {
    const descendantId = rel.from_person_id === personId ? rel.to_person_id : rel.from_person_id;
    if (descendantIds.has(descendantId)) continue;
    descendantIds.add(descendantId);
    const descendant = await buildDescendantTree(descendantId, visited);
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
