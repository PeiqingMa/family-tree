import type { GraphEdge, GraphNode } from '../types';

/**
 * Turns the raw relation list coming from the API into the structures a
 * generational chart needs: adjacency, generation numbers, couple clusters and
 * parent/child "unions" (a set of parents plus the children they share).
 *
 * This module is deliberately free of React and DOM code so the layout can be
 * reasoned about - and checked - in isolation.
 */

/** Stable key for an unordered pair. UUIDs contain '-', so use NUL as separator. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

export interface SpouseLink {
  a: string;
  b: string;
  spouseFrom?: string;
  spouseEnd?: string;
  /** The marriage has an end date recorded, so it is drawn as a broken line. */
  ended: boolean;
}

/** A set of parents together with the children they have in common. */
export interface Union {
  id: string;
  parentIds: string[];
  childIds: string[];
}

/** People who sit side by side on one row because they are married. */
export interface Cluster {
  id: string;
  gen: number;
  members: string[];
}

export interface FamilyModel {
  persons: Map<string, GraphNode>;
  parentsOf: Map<string, string[]>;
  childrenOf: Map<string, string[]>;
  spousesOf: Map<string, string[]>;
  spouseLinks: SpouseLink[];
  spouseLinkOf: Map<string, SpouseLink>;
  generations: Map<string, number>;
  clusters: Map<string, Cluster>;
  clusterOf: Map<string, string>;
  unions: Map<string, Union>;
  /** Union ids in which a person appears as a parent, ordered by marriage date. */
  unionsOfParent: Map<string, string[]>;
  /** The union a person belongs to as a child, if their parents are known. */
  unionOfChild: Map<string, string>;
  /** The focus person plus every ancestor and descendant of theirs. */
  bloodline: Set<string>;
}

const MAX_GENERATION_PASSES = 200;

export function buildFamilyModel(
  nodes: GraphNode[],
  edges: GraphEdge[],
  focusId: string
): FamilyModel {
  const persons = new Map<string, GraphNode>();
  for (const node of nodes) persons.set(node.id, node);

  const parentSets = new Map<string, Set<string>>();
  const childSets = new Map<string, Set<string>>();
  const spouseSets = new Map<string, Set<string>>();
  const spouseLinkOf = new Map<string, SpouseLink>();

  const link = (map: Map<string, Set<string>>, key: string, value: string) => {
    const set = map.get(key) || new Set<string>();
    set.add(value);
    map.set(key, set);
  };

  for (const edge of edges) {
    const from = edge.fromPersonId;
    const to = edge.toPersonId;
    // Ignore self loops and dangling edges - both endpoints must be on screen.
    if (!from || !to || from === to) continue;
    if (!persons.has(from) || !persons.has(to)) continue;

    if (edge.relationType === 'spouse') {
      link(spouseSets, from, to);
      link(spouseSets, to, from);
      const key = pairKey(from, to);
      const existing = spouseLinkOf.get(key);
      const merged: SpouseLink = {
        a: from < to ? from : to,
        b: from < to ? to : from,
        spouseFrom: edge.spouseFrom || existing?.spouseFrom,
        spouseEnd: edge.spouseEnd || existing?.spouseEnd,
        ended: Boolean(edge.spouseEnd || existing?.spouseEnd),
      };
      spouseLinkOf.set(key, merged);
    } else if (edge.relationType === 'parent') {
      // (from, to, 'parent') means: to is a parent of from
      link(parentSets, from, to);
      link(childSets, to, from);
    } else if (edge.relationType === 'child') {
      // (from, to, 'child') means: to is a child of from
      link(parentSets, to, from);
      link(childSets, from, to);
    }
  }

  const sortKey = (id: string) => personSortKey(persons.get(id), id);
  const byBirth = (a: string, b: string) => compareStrings(sortKey(a), sortKey(b));

  const parentsOf = sortedAdjacency(parentSets, persons, byBirth);
  const childrenOf = sortedAdjacency(childSets, persons, byBirth);
  const spousesOf = sortedAdjacency(spouseSets, persons, byBirth);

  const generations = assignGenerations(persons, parentsOf, childrenOf, spousesOf, focusId);
  const { clusters, clusterOf } = buildClusters(
    persons,
    generations,
    spousesOf,
    parentsOf,
    childrenOf,
    spouseLinkOf
  );
  const { unions, unionsOfParent, unionOfChild } = buildUnions(
    persons,
    parentsOf,
    generations,
    byBirth,
    spouseLinkOf
  );

  const spouseLinks = [...spouseLinkOf.values()].sort(
    (x, y) => compareStrings(sortKey(x.a), sortKey(y.a)) || compareStrings(sortKey(x.b), sortKey(y.b))
  );

  return {
    persons,
    parentsOf,
    childrenOf,
    spousesOf,
    spouseLinks,
    spouseLinkOf,
    generations,
    clusters,
    clusterOf,
    unions,
    unionsOfParent,
    unionOfChild,
    bloodline: collectBloodline(focusId, parentsOf, childrenOf),
  };
}

/**
 * Generation numbers relative to the focus person (focus = 0, parents = -1).
 *
 * A breadth-first walk seeds the numbers, then a relaxation loop enforces the
 * two hard constraints - a child is at least one row below every parent, and
 * spouses share a row - until nothing changes. Multi-path ancestry (cousin
 * marriages, remarriages) therefore settles on the deepest consistent row
 * instead of whichever path happened to be walked first.
 */
function assignGenerations(
  persons: Map<string, GraphNode>,
  parentsOf: Map<string, string[]>,
  childrenOf: Map<string, string[]>,
  spousesOf: Map<string, string[]>,
  focusId: string
): Map<string, number> {
  const gen = new Map<string, number>();
  const ids = [...persons.keys()].sort();
  const seeds = persons.has(focusId) ? [focusId, ...ids] : ids;

  for (const seed of seeds) {
    if (gen.has(seed)) continue;
    gen.set(seed, 0);
    const queue = [seed];
    for (let head = 0; head < queue.length; head += 1) {
      const id = queue[head];
      const level = gen.get(id) as number;
      const step = (nextId: string, nextLevel: number) => {
        if (gen.has(nextId)) return;
        gen.set(nextId, nextLevel);
        queue.push(nextId);
      };
      for (const parentId of parentsOf.get(id) || []) step(parentId, level - 1);
      for (const childId of childrenOf.get(id) || []) step(childId, level + 1);
      for (const spouseId of spousesOf.get(id) || []) step(spouseId, level);
    }
  }

  // Contradictory data ("A is B's parent" *and* "B is A's parent") would make the
  // relaxation below push a generation down for ever, so the edges that close a
  // cycle are dropped first. The result stays a DAG with a bounded depth.
  const acyclicChildren = withoutBackEdges(ids, childrenOf);

  for (let pass = 0; pass < MAX_GENERATION_PASSES; pass += 1) {
    let changed = false;

    for (const id of ids) {
      const level = gen.get(id) as number;
      for (const childId of acyclicChildren.get(id) || []) {
        if ((gen.get(childId) as number) <= level) {
          gen.set(childId, level + 1);
          changed = true;
        }
      }
    }

    for (const id of ids) {
      for (const spouseId of spousesOf.get(id) || []) {
        const a = gen.get(id) as number;
        const b = gen.get(spouseId) as number;
        if (a === b) continue;
        // Never pull a spouse above their own parents: only raise the lower one.
        const target = Math.max(a, b);
        if (a !== target) gen.set(id, target);
        if (b !== target) gen.set(spouseId, target);
        changed = true;
      }
    }

    if (!changed) break;
  }

  const focusLevel = gen.get(focusId) ?? 0;
  for (const id of ids) gen.set(id, (gen.get(id) as number) - focusLevel);
  return gen;
}

/** Copy of the parent-to-child adjacency with every cycle-closing edge removed. */
function withoutBackEdges(
  ids: string[],
  childrenOf: Map<string, string[]>
): Map<string, string[]> {
  const UNVISITED = 0;
  const OPEN = 1;
  const CLOSED = 2;
  const state = new Map<string, number>();
  const result = new Map<string, string[]>();
  for (const [id, children] of childrenOf) result.set(id, [...children]);

  for (const root of ids) {
    if ((state.get(root) ?? UNVISITED) !== UNVISITED) continue;
    state.set(root, OPEN);
    const stack: Array<{ id: string; next: number }> = [{ id: root, next: 0 }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const children = result.get(frame.id) || [];
      if (frame.next >= children.length) {
        state.set(frame.id, CLOSED);
        stack.pop();
        continue;
      }
      const childId = children[frame.next];
      frame.next += 1;
      const childState = state.get(childId) ?? UNVISITED;
      if (childState === OPEN) {
        result.set(
          frame.id,
          (result.get(frame.id) as string[]).filter((id) => id !== childId)
        );
        frame.next -= 1;
        continue;
      }
      if (childState === CLOSED) continue;
      state.set(childId, OPEN);
      stack.push({ id: childId, next: 0 });
    }
  }

  return result;
}

/**
 * Groups spouses that share a generation into ordered clusters.
 *
 * The member with the most marriages becomes the hub and is placed in the
 * middle, with partners alternating to the left and the right in marriage-date
 * order. That is what puts the two wives of a twice-married man on either side
 * of him instead of stacking them both on one side.
 */
function buildClusters(
  persons: Map<string, GraphNode>,
  generations: Map<string, number>,
  spousesOf: Map<string, string[]>,
  parentsOf: Map<string, string[]>,
  childrenOf: Map<string, string[]>,
  spouseLinkOf: Map<string, SpouseLink>
): { clusters: Map<string, Cluster>; clusterOf: Map<string, string> } {
  const ids = [...persons.keys()].sort((a, b) =>
    compareStrings(personSortKey(persons.get(a), a), personSortKey(persons.get(b), b))
  );

  // Only same-row marriages hold a couple together; an unusual cross-generation
  // marriage still gets a connector drawn, it just does not form a cluster.
  const partners = new Map<string, string[]>();
  for (const id of ids) {
    partners.set(
      id,
      (spousesOf.get(id) || []).filter((other) => generations.get(other) === generations.get(id))
    );
  }

  const clusters = new Map<string, Cluster>();
  const clusterOf = new Map<string, string>();
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) continue;

    const component: string[] = [];
    const queue = [id];
    seen.add(id);
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      component.push(current);
      for (const other of partners.get(current) || []) {
        if (seen.has(other)) continue;
        seen.add(other);
        queue.push(other);
      }
    }

    const members = orderCluster(component, {
      persons,
      partners,
      parentsOf,
      childrenOf,
      spouseLinkOf,
    });
    const clusterId = `cluster:${members[0]}`;
    clusters.set(clusterId, {
      id: clusterId,
      gen: generations.get(members[0]) ?? 0,
      members,
    });
    for (const member of members) clusterOf.set(member, clusterId);
  }

  return { clusters, clusterOf };
}

interface ClusterContext {
  persons: Map<string, GraphNode>;
  partners: Map<string, string[]>;
  parentsOf: Map<string, string[]>;
  childrenOf: Map<string, string[]>;
  spouseLinkOf: Map<string, SpouseLink>;
}

function orderCluster(component: string[], ctx: ClusterContext): string[] {
  if (component.length === 1) return component;

  const inComponent = new Set(component);
  const degree = (id: string) =>
    (ctx.partners.get(id) || []).filter((other) => inComponent.has(other)).length;

  if (component.length === 2) {
    const [a, b] = component;
    return comparePrimary(a, b, ctx) <= 0 ? [a, b] : [b, a];
  }

  // Hub: most marriages, then the person whose own line continues through this
  // family, so the chart hangs off a single central figure.
  const hub = [...component].sort(
    (a, b) => degree(b) - degree(a) || comparePrimary(a, b, ctx)
  )[0];

  const branches = collectBranches(hub, component, ctx.partners);
  branches.sort((x, y) => {
    const marriageX = ctx.spouseLinkOf.get(pairKey(hub, x.connector))?.spouseFrom || '';
    const marriageY = ctx.spouseLinkOf.get(pairKey(hub, y.connector))?.spouseFrom || '';
    if (marriageX !== marriageY) {
      if (!marriageX) return 1;
      if (!marriageY) return -1;
      return marriageX < marriageY ? -1 : 1;
    }
    return comparePrimary(x.connector, y.connector, ctx);
  });

  const left: string[] = [];
  const right: string[] = [];
  branches.forEach((branch, index) => {
    // orderChain starts at the partner married to the hub, so a left-hand branch
    // is reversed to keep that partner next to the hub.
    const chain = orderChain(branch, ctx);
    if (index % 2 === 0) {
      left.unshift(...[...chain].reverse());
    } else {
      right.push(...chain);
    }
  });

  return [...left, hub, ...right];
}

interface Branch {
  connector: string;
  members: string[];
}

/** The partner groups hanging off the hub, one per direct marriage. */
function collectBranches(
  hub: string,
  component: string[],
  partners: Map<string, string[]>
): Branch[] {
  const inComponent = new Set(component);
  const claimed = new Set<string>([hub]);
  const branches: Branch[] = [];

  for (const connector of (partners.get(hub) || []).filter((id) => inComponent.has(id))) {
    if (claimed.has(connector)) continue;
    const members: string[] = [];
    const queue = [connector];
    claimed.add(connector);
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      members.push(current);
      for (const other of partners.get(current) || []) {
        if (!inComponent.has(other) || claimed.has(other)) continue;
        claimed.add(other);
        queue.push(other);
      }
    }
    branches.push({ connector, members });
  }

  // Anything left over (only reachable through an already-claimed branch) is
  // appended so no member of the component is silently dropped.
  const leftovers = component.filter((id) => !claimed.has(id));
  if (leftovers.length > 0) branches.push({ connector: leftovers[0], members: leftovers });

  return branches;
}

/** Orders a branch as a chain starting at the member married to the hub. */
function orderChain(branch: Branch, ctx: ClusterContext): string[] {
  const remaining = new Set(branch.members);
  const chain: string[] = [];
  let current: string | undefined = branch.connector;

  while (current) {
    chain.push(current);
    remaining.delete(current);
    const next: string | undefined = (ctx.partners.get(current) || [])
      .filter((id) => remaining.has(id))
      .sort((a, b) => comparePrimary(a, b, ctx))[0];
    current = next;
  }

  return [...chain, ...[...remaining].sort((a, b) => comparePrimary(a, b, ctx))];
}

/**
 * Which of two spouses is drawn first (left). Whoever's own parents or children
 * are on the chart carries the family line and leads; otherwise fall back to
 * gender and birth order so the result is stable.
 */
function comparePrimary(a: string, b: string, ctx: ClusterContext): number {
  const weight = (id: string) =>
    (ctx.parentsOf.get(id)?.length ? 2 : 0) + (ctx.childrenOf.get(id)?.length ? 1 : 0);
  const byLine = weight(b) - weight(a);
  if (byLine !== 0) return byLine;

  const genderRank = (id: string) => {
    const gender = ctx.persons.get(id)?.bioGender;
    if (gender === 'Male') return 0;
    if (gender === 'Female') return 1;
    return 2;
  };
  const byGender = genderRank(a) - genderRank(b);
  if (byGender !== 0) return byGender;

  return compareStrings(personSortKey(ctx.persons.get(a), a), personSortKey(ctx.persons.get(b), b));
}

/**
 * A union is keyed by the exact set of a child's parents, so half-siblings from
 * a second marriage form their own group while full siblings stay together.
 * Childless couples need no union - their cluster already keeps them adjacent.
 */
function buildUnions(
  persons: Map<string, GraphNode>,
  parentsOf: Map<string, string[]>,
  generations: Map<string, number>,
  byBirth: (a: string, b: string) => number,
  spouseLinkOf: Map<string, SpouseLink>
): {
  unions: Map<string, Union>;
  unionsOfParent: Map<string, string[]>;
  unionOfChild: Map<string, string>;
} {
  const unions = new Map<string, Union>();
  const unionOfChild = new Map<string, string>();

  const childIds = [...persons.keys()].sort(byBirth);
  for (const childId of childIds) {
    const parentIds = (parentsOf.get(childId) || []).filter(
      // A "parent" on the same row or below is broken data; skip it rather than
      // drawing a connector that travels upwards.
      (parentId) => (generations.get(parentId) as number) < (generations.get(childId) as number)
    );
    if (parentIds.length === 0) continue;

    const signature = [...parentIds].sort().join('\u0000');
    const unionId = `union:${signature}`;
    const union = unions.get(unionId) || { id: unionId, parentIds: [...parentIds], childIds: [] };
    union.childIds.push(childId);
    unions.set(unionId, union);
    unionOfChild.set(childId, unionId);
  }

  const unionsOfParent = new Map<string, string[]>();
  for (const union of unions.values()) {
    union.childIds.sort(byBirth);
    for (const parentId of union.parentIds) {
      const list = unionsOfParent.get(parentId) || [];
      list.push(union.id);
      unionsOfParent.set(parentId, list);
    }
  }

  // Successive marriages read left to right in the order they happened.
  for (const [parentId, unionIds] of unionsOfParent) {
    unionIds.sort((x, y) => {
      const dateX = marriageDate(unions.get(x) as Union, parentId, spouseLinkOf);
      const dateY = marriageDate(unions.get(y) as Union, parentId, spouseLinkOf);
      if (dateX !== dateY) {
        if (!dateX) return 1;
        if (!dateY) return -1;
        return dateX < dateY ? -1 : 1;
      }
      const firstChildX = (unions.get(x) as Union).childIds[0];
      const firstChildY = (unions.get(y) as Union).childIds[0];
      return byBirth(firstChildX, firstChildY);
    });
  }

  return { unions, unionsOfParent, unionOfChild };
}

function marriageDate(
  union: Union,
  parentId: string,
  spouseLinkOf: Map<string, SpouseLink>
): string {
  for (const other of union.parentIds) {
    if (other === parentId) continue;
    const link = spouseLinkOf.get(pairKey(parentId, other));
    if (link?.spouseFrom) return link.spouseFrom;
  }
  return '';
}

/** The focus person together with every ancestor and descendant of theirs. */
function collectBloodline(
  focusId: string,
  parentsOf: Map<string, string[]>,
  childrenOf: Map<string, string[]>
): Set<string> {
  const bloodline = new Set<string>([focusId]);

  const walk = (map: Map<string, string[]>) => {
    const queue = [focusId];
    const seen = new Set<string>([focusId]);
    for (let head = 0; head < queue.length; head += 1) {
      for (const next of map.get(queue[head]) || []) {
        if (seen.has(next)) continue;
        seen.add(next);
        bloodline.add(next);
        queue.push(next);
      }
    }
  };

  walk(parentsOf);
  walk(childrenOf);
  return bloodline;
}

function sortedAdjacency(
  sets: Map<string, Set<string>>,
  persons: Map<string, GraphNode>,
  compare: (a: string, b: string) => number
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const [id, set] of sets) {
    if (!persons.has(id)) continue;
    result.set(id, [...set].filter((other) => persons.has(other)).sort(compare));
  }
  return result;
}

/** Birth year first, then name, then id - stable and locale independent. */
export function personSortKey(person: GraphNode | undefined, id: string): string {
  const birth = person?.lifeFrom ? person.lifeFrom.padEnd(10, '0') : '~~~~~~~~~~';
  const name = person?.names?.[0];
  const label = [name?.fullName, name?.familyName, name?.givenName, name?.middleName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return `${birth}|${label}|${id}`;
}

function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
