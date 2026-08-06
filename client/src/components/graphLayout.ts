import type { GraphNode, GraphEdge } from '../types';

export interface LayoutNode {
  id: string;
  node: GraphNode;
  x: number;
  y: number;
  generation: number;
}

export interface LayoutLink {
  sourceId: string;
  targetId: string;
  type: 'spouse' | 'parent-child';
  isDivorced: boolean;
}

export interface FamilyUnit {
  parents: string[];
  children: string[];
  isDivorced: boolean;
}

const NODE_RADIUS = 30;
const HORIZONTAL_SPACING = 180;
const VERTICAL_SPACING = 180;
const SPOUSE_GAP = 100;

export function buildLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Build relationships
  const spousePairs: Map<string, { isDivorced: boolean }> = new Map();
  const parentChildMap: Map<string, Set<string>> = new Map();
  const childParentMap: Map<string, Set<string>> = new Map();

  for (const edge of edges) {
    if (edge.relationType === 'spouse') {
      const key = [edge.fromPersonId, edge.toPersonId].sort().join('|');
      if (!spousePairs.has(key)) {
        spousePairs.set(key, { isDivorced: !!edge.spouseEnd });
      }
    } else if (edge.relationType === 'child') {
      if (!parentChildMap.has(edge.fromPersonId)) parentChildMap.set(edge.fromPersonId, new Set());
      parentChildMap.get(edge.fromPersonId)!.add(edge.toPersonId);
      if (!childParentMap.has(edge.toPersonId)) childParentMap.set(edge.toPersonId, new Set());
      childParentMap.get(edge.toPersonId)!.add(edge.fromPersonId);
    } else if (edge.relationType === 'parent') {
      if (!parentChildMap.has(edge.toPersonId)) parentChildMap.set(edge.toPersonId, new Set());
      parentChildMap.get(edge.toPersonId)!.add(edge.fromPersonId);
      if (!childParentMap.has(edge.fromPersonId)) childParentMap.set(edge.fromPersonId, new Set());
      childParentMap.get(edge.fromPersonId)!.add(edge.toPersonId);
    }
  }

  // Assign generations
  const generations = new Map<string, number>();
  const nodeIds = nodes.map(n => n.id);

  function getGeneration(id: string, visited: Set<string>): number {
    if (generations.has(id)) return generations.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const parents = childParentMap.get(id);
    if (!parents || parents.size === 0) {
      generations.set(id, 0);
      return 0;
    }
    let maxParentGen = 0;
    for (const pid of parents) {
      maxParentGen = Math.max(maxParentGen, getGeneration(pid, visited));
    }
    const gen = maxParentGen + 1;
    generations.set(id, gen);
    return gen;
  }

  for (const id of nodeIds) getGeneration(id, new Set());

  // Unify spouses to same generation and propagate
  let changed = true;
  while (changed) {
    changed = false;
    for (const pairKey of spousePairs.keys()) {
      const [p1, p2] = pairKey.split('|');
      const g1 = generations.get(p1) ?? 0;
      const g2 = generations.get(p2) ?? 0;
      if (g1 !== g2) {
        const max = Math.max(g1, g2);
        if (g1 < max) { generations.set(p1, max); changed = true; }
        if (g2 < max) { generations.set(p2, max); changed = true; }
      }
    }
    for (const id of nodeIds) {
      const parents = childParentMap.get(id);
      if (!parents || parents.size === 0) continue;
      let maxParentGen = 0;
      for (const pid of parents) maxParentGen = Math.max(maxParentGen, generations.get(pid) ?? 0);
      const required = maxParentGen + 1;
      if ((generations.get(id) ?? 0) < required) {
        generations.set(id, required);
        changed = true;
      }
    }
  }

  // Build family units
  const familyUnits: FamilyUnit[] = [];
  const assignedChildren = new Set<string>();

  for (const [pairKey, info] of spousePairs) {
    const [p1, p2] = pairKey.split('|');
    const c1 = parentChildMap.get(p1) || new Set<string>();
    const c2 = parentChildMap.get(p2) || new Set<string>();
    const shared: string[] = [];
    for (const c of c1) {
      if (c2.has(c)) shared.push(c);
    }
    familyUnits.push({ parents: [p1, p2], children: shared, isDivorced: info.isDivorced });
    shared.forEach(c => assignedChildren.add(c));
  }

  for (const [parentId, children] of parentChildMap) {
    const uncovered = [...children].filter(c => !assignedChildren.has(c));
    if (uncovered.length > 0) {
      familyUnits.push({ parents: [parentId], children: uncovered, isDivorced: false });
      uncovered.forEach(c => assignedChildren.add(c));
    }
  }

  // Group by generation
  const genGroups = new Map<number, string[]>();
  for (const [id, gen] of generations) {
    if (!genGroups.has(gen)) genGroups.set(gen, []);
    genGroups.get(gen)!.push(id);
  }

  const sortedGens = [...genGroups.keys()].sort((a, b) => a - b);

  // Position nodes
  const positions = new Map<string, { x: number; y: number }>();
  const positioned = new Set<string>();

  for (const gen of sortedGens) {
    const y = gen * VERTICAL_SPACING;
    const nodesInGen = genGroups.get(gen)!;
    const unitsAtGen = familyUnits.filter(u => u.parents.some(p => generations.get(p) === gen));
    let xOffset = 0;

    for (const unit of unitsAtGen) {
      const parentsInGen = unit.parents.filter(p => generations.get(p) === gen);
      if (parentsInGen.length === 2) {
        const [p1, p2] = parentsInGen;
        if (!positioned.has(p1)) {
          positions.set(p1, { x: xOffset, y });
          positioned.add(p1);
        } else {
          xOffset = positions.get(p1)!.x;
        }
        if (!positioned.has(p2)) {
          positions.set(p2, { x: xOffset + SPOUSE_GAP, y });
          positioned.add(p2);
        }
        xOffset = Math.max(xOffset + SPOUSE_GAP + HORIZONTAL_SPACING, (positions.get(p2)?.x ?? 0) + HORIZONTAL_SPACING);
      } else if (parentsInGen.length === 1) {
        const p = parentsInGen[0];
        if (!positioned.has(p)) {
          positions.set(p, { x: xOffset, y });
          positioned.add(p);
          xOffset += HORIZONTAL_SPACING;
        }
      }
    }

    for (const nodeId of nodesInGen) {
      if (!positioned.has(nodeId)) {
        positions.set(nodeId, { x: xOffset, y });
        positioned.add(nodeId);
        xOffset += HORIZONTAL_SPACING;
      }
    }
  }

  // Center children below parents
  for (const unit of familyUnits) {
    if (unit.children.length === 0) continue;
    const parentPositions = unit.parents.map(p => positions.get(p)).filter(Boolean) as { x: number; y: number }[];
    if (parentPositions.length === 0) continue;
    const parentCenterX = parentPositions.reduce((s, p) => s + p.x, 0) / parentPositions.length;
    const totalWidth = (unit.children.length - 1) * HORIZONTAL_SPACING;
    const startX = parentCenterX - totalWidth / 2;
    for (let i = 0; i < unit.children.length; i++) {
      const cid = unit.children[i];
      const cgen = generations.get(cid);
      if (cgen === undefined) continue;
      positions.set(cid, { x: startX + i * HORIZONTAL_SPACING, y: cgen * VERTICAL_SPACING });
    }
  }

  // Resolve overlaps
  for (const gen of sortedGens) {
    const nodesInGen = genGroups.get(gen)!.filter(id => positions.has(id));
    nodesInGen.sort((a, b) => positions.get(a)!.x - positions.get(b)!.x);
    for (let i = 1; i < nodesInGen.length; i++) {
      const prev = positions.get(nodesInGen[i - 1])!;
      const curr = positions.get(nodesInGen[i])!;
      const minX = prev.x + HORIZONTAL_SPACING;
      if (curr.x < minX) {
        const shift = minX - curr.x;
        for (let j = i; j < nodesInGen.length; j++) {
          positions.get(nodesInGen[j])!.x += shift;
        }
      }
    }
  }

  // Bottom-up: re-center parents above children
  const reversedGens = [...sortedGens].reverse();
  const recentered = new Set<string>();
  for (const gen of reversedGens) {
    const unitsHere = familyUnits.filter(u => u.children.length > 0 && u.parents.some(p => generations.get(p) === gen));
    for (const unit of unitsHere) {
      const parentsInGen = unit.parents.filter(p => generations.get(p) === gen);
      if (parentsInGen.some(p => recentered.has(p))) continue;
      const childPositions = unit.children.map(c => positions.get(c)).filter(Boolean) as { x: number; y: number }[];
      if (childPositions.length === 0) continue;
      const childCenter = childPositions.reduce((s, p) => s + p.x, 0) / childPositions.length;
      const parentPos = parentsInGen.map(p => positions.get(p)).filter(Boolean) as { x: number; y: number }[];
      if (parentPos.length === 0) continue;
      const parentCenter = parentPos.reduce((s, p) => s + p.x, 0) / parentPos.length;
      const shift = childCenter - parentCenter;
      if (Math.abs(shift) > 1) {
        for (const pid of parentsInGen) {
          const pos = positions.get(pid);
          if (pos) pos.x += shift;
        }
      }
      parentsInGen.forEach(p => recentered.add(p));
    }
  }

  // Final overlap resolution
  for (const gen of sortedGens) {
    const nodesInGen = genGroups.get(gen)!.filter(id => positions.has(id));
    nodesInGen.sort((a, b) => positions.get(a)!.x - positions.get(b)!.x);
    for (let i = 1; i < nodesInGen.length; i++) {
      const prev = positions.get(nodesInGen[i - 1])!;
      const curr = positions.get(nodesInGen[i])!;
      const minX = prev.x + HORIZONTAL_SPACING;
      if (curr.x < minX) {
        const shift = minX - curr.x;
        for (let j = i; j < nodesInGen.length; j++) {
          positions.get(nodesInGen[j])!.x += shift;
        }
      }
    }
  }

  // Build layout nodes
  const layoutNodes: LayoutNode[] = [];
  for (const node of nodes) {
    const pos = positions.get(node.id) || { x: 0, y: 0 };
    layoutNodes.push({
      id: node.id,
      node,
      x: pos.x,
      y: pos.y,
      generation: generations.get(node.id) ?? 0,
    });
  }

  // Build layout links
  const layoutLinks: LayoutLink[] = [];
  const linkKeys = new Set<string>();

  for (const [pairKey, info] of spousePairs) {
    const [p1, p2] = pairKey.split('|');
    layoutLinks.push({ sourceId: p1, targetId: p2, type: 'spouse', isDivorced: info.isDivorced });
  }

  for (const edge of edges) {
    let parentId: string, childId: string;
    if (edge.relationType === 'child') {
      parentId = edge.fromPersonId;
      childId = edge.toPersonId;
    } else if (edge.relationType === 'parent') {
      parentId = edge.toPersonId;
      childId = edge.fromPersonId;
    } else {
      continue;
    }
    const key = `${parentId}|${childId}`;
    if (linkKeys.has(key)) continue;
    linkKeys.add(key);
    layoutLinks.push({ sourceId: parentId, targetId: childId, type: 'parent-child', isDivorced: false });
  }

  return { layoutNodes, layoutLinks, familyUnits, positions, generations, spousePairs, parentChildMap, childParentMap };
}

export function getAncestorIds(id: string, childParentMap: Map<string, Set<string>>): Set<string> {
  const result = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.pop()!;
    const parents = childParentMap.get(current);
    if (parents) {
      for (const p of parents) {
        if (!result.has(p)) {
          result.add(p);
          queue.push(p);
        }
      }
    }
  }
  return result;
}

export function getDescendantIds(id: string, parentChildMap: Map<string, Set<string>>): Set<string> {
  const result = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.pop()!;
    const children = parentChildMap.get(current);
    if (children) {
      for (const c of children) {
        if (!result.has(c)) {
          result.add(c);
          queue.push(c);
        }
      }
    }
  }
  return result;
}

export function getSpouseIds(id: string, spousePairs: Map<string, { isDivorced: boolean }>): Set<string> {
  const result = new Set<string>();
  for (const key of spousePairs.keys()) {
    const [p1, p2] = key.split('|');
    if (p1 === id) result.add(p2);
    if (p2 === id) result.add(p1);
  }
  return result;
}

export { NODE_RADIUS, HORIZONTAL_SPACING, VERTICAL_SPACING, SPOUSE_GAP };
