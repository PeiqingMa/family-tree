import type { Cluster, FamilyModel, Union } from './familyModel';

/**
 * A generational chart layout.
 *
 * Guarantees, in order of priority:
 *   1. Everybody in a generation shares one row (y is a pure function of the
 *      generation number).
 *   2. No two cards ever overlap. Every block is packed against the horizontal
 *      space already occupied on each row, so collisions are impossible by
 *      construction rather than repaired afterwards.
 *   3. Children hang centred under the couple they belong to, and a couple sits
 *      centred over its children.
 *   4. The chart stays balanced around the focus person: successive marriages
 *      fan out to alternating sides and each marriage's children hang under
 *      that marriage.
 *
 * The recursion walks a spanning tree of *clusters* (married groups that must
 * stay side by side) rooted at the focus person, so the focus family is placed
 * first and everything else arranges itself around it.
 */

export interface LayoutMetrics {
  cardWidth: number;
  cardHeight: number;
  rowHeight: number;
  /** Distance from the top of a card to the middle of the portrait. */
  portraitCenterY: number;
  /** Space between two married cards - the marriage line spans this gap. */
  spouseGap: number;
  /** Space between neighbouring sibling blocks. */
  siblingGap: number;
  /** Space between unrelated blocks, e.g. two separate families. */
  groupGap: number;
  /** Smallest empty space allowed between any two cards on a row. */
  minGap: number;
  /** How far above the child row the horizontal sibling bar is drawn. */
  busOffset: number;
}

export const DEFAULT_METRICS: LayoutMetrics = {
  cardWidth: 150,
  cardHeight: 132,
  rowHeight: 210,
  portraitCenterY: 38,
  spouseGap: 40,
  siblingGap: 36,
  groupGap: 64,
  minGap: 24,
  busOffset: 32,
};

export interface PositionedPerson {
  id: string;
  gen: number;
  /** Top-left corner of the card. */
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  /** Vertical middle of the portrait, where marriage lines meet. */
  portraitY: number;
}

export interface LayoutConnector {
  unionId: string;
  parentIds: string[];
  childIds: string[];
  stemX: number;
  stemTopY: number;
  busY: number;
  busFromX: number;
  busToX: number;
  childPoints: Array<{ id: string; x: number; y: number }>;
  /** Part of the focus person's direct line, drawn as the highlighted lineage. */
  bloodline: boolean;
}

export interface LayoutMarriage {
  key: string;
  a: string;
  b: string;
  ended: boolean;
  /** 'inline' is a straight line through the gap between two adjacent cards. */
  route: 'inline' | 'below';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Depth of the detour used by the 'below' route. */
  dipY: number;
}

export interface TreeLayout {
  focusId: string;
  metrics: LayoutMetrics;
  persons: PositionedPerson[];
  personById: Map<string, PositionedPerson>;
  connectors: LayoutConnector[];
  marriages: LayoutMarriage[];
  rows: Array<{ gen: number; y: number }>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface Interval {
  start: number;
  end: number;
}

/** Horizontal space occupied per generation, as sorted disjoint runs. */
type Rows = Map<number, Interval[]>;

interface Block {
  positions: Map<string, number>;
  rows: Rows;
  /** Local x of the middle of the block's own cluster. */
  anchor: number;
  /** Space kept free for the cluster that asked for this block. */
  slot: Interval | null;
}

const SLOT_KEY = '\u0000slot';

export function layoutFamilyTree(
  model: FamilyModel,
  focusId: string,
  metrics: LayoutMetrics = DEFAULT_METRICS
): TreeLayout {
  if (model.persons.size === 0) {
    return {
      focusId,
      metrics,
      persons: [],
      personById: new Map(),
      connectors: [],
      marriages: [],
      rows: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    };
  }

  const engine = new LayoutEngine(model, metrics);
  const focusCluster = model.clusterOf.get(focusId);
  const root = focusCluster ? engine.layoutCluster(focusCluster, null) : newBlock();

  // Anything not reachable from the focus (separate family islands) is parked to
  // the right, so it stays visible but never lands on top of the main chart.
  for (const clusterId of [...model.clusters.keys()].sort()) {
    if (engine.visited.has(clusterId)) continue;
    const island = engine.layoutCluster(clusterId, null);
    shiftBlock(island, packedOffset(root.rows, island.rows, metrics.groupGap * 2));
    mergeBlock(root, island);
  }

  return engine.finish(root, focusId);
}

class LayoutEngine {
  readonly visited = new Set<string>();
  /** The order each cluster's members were actually laid out in. */
  private readonly memberOrders = new Map<string, string[]>();

  constructor(private readonly model: FamilyModel, private readonly metrics: LayoutMetrics) {}

  /**
   * Lays out one cluster together with everything hanging off it.
   *
   * `reserveFor` is set when a cluster asks its parents to be laid out: the
   * parents then keep an empty slot of exactly the right width for the asking
   * cluster, so its siblings arrange themselves around it in birth order
   * instead of being pushed aside afterwards.
   */
  layoutCluster(clusterId: string, reserveFor: string | null): Block {
    this.visited.add(clusterId);
    const cluster = this.model.clusters.get(clusterId);
    const block = newBlock();
    if (!cluster) return block;

    const { cardWidth, spouseGap, minGap } = this.metrics;
    const members = this.orderedMembers(clusterId);
    this.memberOrders.set(clusterId, members);
    let cursor = 0;
    for (const member of members) {
      block.positions.set(member, cursor);
      cursor += cardWidth + spouseGap;
    }
    const width = clusterWidth(members.length, this.metrics);
    addInterval(block.rows, cluster.gen, 0, width);
    block.anchor = width / 2;

    this.attachAncestors(block, cluster, clusterId);
    this.attachDescendants(block, cluster, reserveFor);

    // Hand the reserved slot back to the caller and stop advertising it as
    // occupied, because the caller's own cards will fill exactly that space.
    const slotX = block.positions.get(SLOT_KEY);
    if (reserveFor !== null && slotX !== undefined) {
      const slotCluster = this.model.clusters.get(reserveFor);
      const slotWidth = clusterWidth(slotCluster?.members.length ?? 1, this.metrics);
      const slotGen = slotCluster?.gen ?? cluster.gen;
      block.slot = { start: slotX, end: slotX + slotWidth };
      subtractInterval(block.rows, slotGen, slotX - minGap / 2, slotX + slotWidth + minGap / 2);
      block.positions.delete(SLOT_KEY);
    }

    return block;
  }

  /** Places the parent couples of this cluster's members on the row above. */
  private attachAncestors(block: Block, cluster: Cluster, clusterId: string): void {
    const { cardWidth, siblingGap, minGap } = this.metrics;

    const unionIds: string[] = [];
    for (const member of cluster.members) {
      const unionId = this.model.unionOfChild.get(member);
      if (unionId && !unionIds.includes(unionId)) unionIds.push(unionId);
    }

    for (const unionId of unionIds) {
      const union = this.model.unions.get(unionId) as Union;
      const group = newBlock();
      const slotRefs: number[] = [];
      let placed = 0;

      for (const parentClusterId of uniqueClusters(union.parentIds, this.model)) {
        // A cluster already on the chart (a shared ancestor reached by another
        // path) keeps its position; only its connector is drawn again.
        if (this.visited.has(parentClusterId)) continue;
        const parentBlock = this.layoutCluster(parentClusterId, clusterId);
        shiftBlock(
          parentBlock,
          placed === 0 ? 0 : packedOffset(group.rows, parentBlock.rows, siblingGap)
        );
        if (parentBlock.slot) slotRefs.push(midpoint(parentBlock.slot));
        mergeBlock(group, parentBlock);
        placed += 1;
      }

      if (placed === 0) continue;

      let preferred: number;
      const slotReference = average(slotRefs);
      if (slotReference !== undefined) {
        // Drop into the slot the parents kept free for this whole cluster.
        preferred = block.anchor - slotReference;
      } else {
        // No slot (unusual data): centre the parents over their child instead.
        const childCenters = cluster.members
          .filter((member) => this.model.unionOfChild.get(member) === unionId)
          .map((member) => (block.positions.get(member) as number) + cardWidth / 2);
        const parentCenters = union.parentIds
          .map((id) => group.positions.get(id))
          .filter((x): x is number => x !== undefined)
          .map((x) => x + cardWidth / 2);
        preferred =
          (spanCenter(childCenters) ?? block.anchor) - (spanCenter(parentCenters) ?? group.anchor);
      }

      shiftBlock(group, place(block.rows, group.rows, preferred, minGap));
      mergeBlock(block, group);
    }
  }

  /** Places the children of every marriage of this cluster on the row below. */
  private attachDescendants(block: Block, cluster: Cluster, reserveFor: string | null): void {
    const { cardWidth, siblingGap, minGap } = this.metrics;

    const unionIds: string[] = [];
    for (const member of cluster.members) {
      for (const unionId of this.model.unionsOfParent.get(member) || []) {
        if (!unionIds.includes(unionId)) unionIds.push(unionId);
      }
    }

    // Each marriage's children hang under that marriage, so a man married twice
    // gets one family on his left and one on his right.
    const unionAnchorOf = (unionId: string): number => {
      const union = this.model.unions.get(unionId) as Union;
      const centers = union.parentIds
        .map((id) => block.positions.get(id))
        .filter((x): x is number => x !== undefined)
        .map((x) => x + cardWidth / 2);
      return average(centers) ?? block.anchor;
    };
    unionIds.sort((a, b) => unionAnchorOf(a) - unionAnchorOf(b));

    for (const unionId of unionIds) {
      const union = this.model.unions.get(unionId) as Union;
      const childClusters = uniqueClusters(union.childIds, this.model);
      const group = newBlock();
      const references: number[] = [];
      let placed = 0;

      for (const childClusterId of childClusters) {
        let childBlock: Block;
        if (childClusterId === reserveFor) {
          childBlock = this.slotBlock(childClusterId);
        } else if (this.visited.has(childClusterId)) {
          continue;
        } else {
          childBlock = this.layoutCluster(childClusterId, null);
        }

        shiftBlock(
          childBlock,
          placed === 0 ? 0 : packedOffset(group.rows, childBlock.rows, siblingGap)
        );
        // Centre the parents over their own children, not over the in-laws that
        // came along with them.
        if (childClusterId === reserveFor && childBlock.slot) {
          references.push(childBlock.slot.start + this.bloodOffsetInSlot(childClusterId, union));
        } else {
          for (const childId of union.childIds) {
            const x = childBlock.positions.get(childId);
            if (x !== undefined) references.push(x + cardWidth / 2);
          }
        }
        mergeBlock(group, childBlock);
        placed += 1;
      }

      if (placed === 0) continue;

      const preferred = unionAnchorOf(unionId) - (spanCenter(references) ?? group.anchor);
      shiftBlock(group, place(block.rows, group.rows, preferred, minGap));
      mergeBlock(block, group);
    }
  }

  /**
   * Orders a cluster's members so the blood relative faces the middle of its
   * sibling group: brothers and sisters end up next to each other with their
   * partners on the outside, the way a printed chart is drawn.
   *
   * Both the sibling group and this cluster's place in it come from the model,
   * not from coordinates, so the answer is the same however the recursion
   * happens to reach this cluster.
   */
  private orderedMembers(clusterId: string): string[] {
    const members = this.model.clusters.get(clusterId)?.members ?? [];
    if (members.length < 2) return members;

    for (const member of members) {
      const unionId = this.model.unionOfChild.get(member);
      if (!unionId) continue;
      const union = this.model.unions.get(unionId) as Union;
      const siblings = uniqueClusters(union.childIds, this.model);
      const index = siblings.indexOf(clusterId);
      if (siblings.length < 2 || index < 0) return members;

      const bloodPositions = members
        .map((candidate, position) => (union.childIds.includes(candidate) ? position : -1))
        .filter((position) => position >= 0);
      if (bloodPositions.length !== 1) return members;

      const facesRight = index < (siblings.length - 1) / 2;
      const bloodAtStart = bloodPositions[0] === 0;
      const bloodAtEnd = bloodPositions[0] === members.length - 1;
      if (facesRight && bloodAtStart) return [...members].reverse();
      if (!facesRight && bloodAtEnd) return [...members].reverse();
      return members;
    }

    return members;
  }

  /**
   * Where inside a reserved slot the child of this union will end up, so the
   * parents can be centred over the child rather than over the couple.
   */
  private bloodOffsetInSlot(clusterId: string, union: Union): number {
    const { cardWidth, spouseGap } = this.metrics;
    const members =
      this.memberOrders.get(clusterId) ?? this.model.clusters.get(clusterId)?.members ?? [];
    const index = members.findIndex((member) => union.childIds.includes(member));
    const position = index < 0 ? (members.length - 1) / 2 : index;
    return position * (cardWidth + spouseGap) + cardWidth / 2;
  }

  /** An empty block standing in for a cluster that is positioned elsewhere. */
  private slotBlock(clusterId: string): Block {
    const cluster = this.model.clusters.get(clusterId);
    const block = newBlock();
    const width = clusterWidth(cluster?.members.length ?? 1, this.metrics);
    block.positions.set(SLOT_KEY, 0);
    addInterval(block.rows, cluster?.gen ?? 0, 0, width);
    block.anchor = width / 2;
    block.slot = { start: 0, end: width };
    return block;
  }

  finish(root: Block, focusId: string): TreeLayout {
    const { cardWidth, cardHeight, rowHeight, portraitCenterY } = this.metrics;
    const focusX = root.positions.get(focusId) ?? root.anchor - cardWidth / 2;
    // The focus person's portrait sits at the origin, so the view only has to
    // point its centre at (0, 0) to open on them.
    const offsetX = -(focusX + cardWidth / 2);

    const persons: PositionedPerson[] = [];
    const personById = new Map<string, PositionedPerson>();
    for (const [id, localX] of root.positions) {
      if (id === SLOT_KEY) continue;
      const gen = this.model.generations.get(id);
      if (gen === undefined) continue;
      const x = localX + offsetX;
      const y = gen * rowHeight - cardHeight / 2;
      const positioned: PositionedPerson = {
        id,
        gen,
        x,
        y,
        centerX: x + cardWidth / 2,
        centerY: y + cardHeight / 2,
        portraitY: y + portraitCenterY,
      };
      persons.push(positioned);
      personById.set(id, positioned);
    }
    persons.sort((a, b) => a.gen - b.gen || a.x - b.x);

    return {
      focusId,
      metrics: this.metrics,
      persons,
      personById,
      connectors: this.buildConnectors(personById),
      marriages: this.buildMarriages(personById),
      rows: [...new Set(persons.map((person) => person.gen))]
        .sort((a, b) => a - b)
        .map((gen) => ({ gen, y: gen * rowHeight })),
      bounds: computeBounds(persons, this.metrics),
    };
  }

  private buildConnectors(positions: Map<string, PositionedPerson>): LayoutConnector[] {
    const { cardHeight, cardWidth, busOffset } = this.metrics;
    const connectors: LayoutConnector[] = [];

    const cardsByGen = new Map<number, PositionedPerson[]>();
    for (const person of positions.values()) {
      const list = cardsByGen.get(person.gen) || [];
      list.push(person);
      cardsByGen.set(person.gen, list);
    }

    for (const union of this.model.unions.values()) {
      const parents = union.parentIds
        .map((id) => positions.get(id))
        .filter((person): person is PositionedPerson => person !== undefined);
      const children = union.childIds
        .map((id) => positions.get(id))
        .filter((person): person is PositionedPerson => person !== undefined);
      if (parents.length === 0 || children.length === 0) continue;

      const parentGen = Math.max(...parents.map((parent) => parent.gen));
      const childTop = Math.min(...children.map((child) => child.y));
      // Broken data could put a "child" level with or above its parents; drawing
      // that would produce a line running backwards, so skip it.
      if (childTop <= Math.max(...parents.map((parent) => parent.y))) continue;

      const stemX = average(parents.map((parent) => parent.centerX)) as number;
      // Drop out of the marriage line when the stem can run down the gap between
      // the partners, otherwise start underneath the cards.
      const throughCard = (cardsByGen.get(parentGen) || []).some(
        (card) => stemX > card.x - 2 && stemX < card.x + cardWidth + 2
      );
      const stemTopY =
        !throughCard && parents.length > 1 && parents.every((parent) => parent.gen === parentGen)
          ? (average(parents.map((parent) => parent.portraitY)) as number)
          : Math.max(...parents.map((parent) => parent.y)) + cardHeight;

      const busY = childTop - busOffset;
      const childPoints = children.map((child) => ({
        id: child.id,
        x: child.centerX,
        y: child.y,
      }));
      const xs = [stemX, ...childPoints.map((point) => point.x)];

      connectors.push({
        unionId: union.id,
        parentIds: parents.map((parent) => parent.id),
        childIds: children.map((child) => child.id),
        stemX,
        stemTopY: Math.min(stemTopY, busY),
        busY,
        busFromX: Math.min(...xs),
        busToX: Math.max(...xs),
        childPoints,
        bloodline:
          parents.some((parent) => this.model.bloodline.has(parent.id)) &&
          children.some((child) => this.model.bloodline.has(child.id)),
      });
    }

    return connectors;
  }

  private buildMarriages(positions: Map<string, PositionedPerson>): LayoutMarriage[] {
    const { cardWidth, cardHeight, spouseGap } = this.metrics;
    const marriages: LayoutMarriage[] = [];

    for (const link of this.model.spouseLinks) {
      const first = positions.get(link.a);
      const second = positions.get(link.b);
      if (!first || !second) continue;

      const [left, right] = first.centerX <= second.centerX ? [first, second] : [second, first];
      const adjacent = left.gen === right.gen && right.x - (left.x + cardWidth) <= spouseGap + 1;

      marriages.push(
        adjacent
          ? {
              key: `${link.a}|${link.b}`,
              a: left.id,
              b: right.id,
              ended: link.ended,
              route: 'inline',
              fromX: left.x + cardWidth,
              fromY: left.portraitY,
              toX: right.x,
              toY: right.portraitY,
              dipY: left.portraitY,
            }
          : {
              // Partners that could not be seated together - a remarriage far
              // across the chart - are joined by a line dipping below the cards.
              key: `${link.a}|${link.b}`,
              a: left.id,
              b: right.id,
              ended: link.ended,
              route: 'below',
              fromX: left.centerX,
              fromY: left.y + cardHeight,
              toX: right.centerX,
              toY: right.y + cardHeight,
              dipY: Math.max(left.y, right.y) + cardHeight + 22,
            }
      );
    }

    return marriages;
  }
}

function clusterWidth(memberCount: number, metrics: LayoutMetrics): number {
  const count = Math.max(1, memberCount);
  return count * metrics.cardWidth + (count - 1) * metrics.spouseGap;
}

function uniqueClusters(personIds: string[], model: FamilyModel): string[] {
  const result: string[] = [];
  for (const id of personIds) {
    const clusterId = model.clusterOf.get(id);
    if (clusterId && !result.includes(clusterId)) result.push(clusterId);
  }
  return result;
}

function newBlock(): Block {
  return { positions: new Map(), rows: new Map(), anchor: 0, slot: null };
}

function midpoint(interval: Interval): number {
  return (interval.start + interval.end) / 2;
}

function shiftBlock(block: Block, dx: number): void {
  if (dx === 0) return;
  for (const [id, x] of block.positions) block.positions.set(id, x + dx);
  for (const [gen, intervals] of block.rows) {
    block.rows.set(
      gen,
      intervals.map((interval) => ({ start: interval.start + dx, end: interval.end + dx }))
    );
  }
  block.anchor += dx;
  if (block.slot) block.slot = { start: block.slot.start + dx, end: block.slot.end + dx };
}

function mergeBlock(base: Block, incoming: Block): void {
  for (const [id, x] of incoming.positions) base.positions.set(id, x);
  for (const [gen, intervals] of incoming.rows) {
    for (const interval of intervals) addInterval(base.rows, gen, interval.start, interval.end);
  }
}

function addInterval(rows: Rows, gen: number, start: number, end: number): void {
  const list = rows.get(gen) || [];
  list.push({ start, end });
  rows.set(gen, normalize(list));
}

function subtractInterval(rows: Rows, gen: number, start: number, end: number): void {
  const list = rows.get(gen);
  if (!list) return;
  const result: Interval[] = [];
  for (const interval of list) {
    if (interval.end <= start || interval.start >= end) {
      result.push(interval);
      continue;
    }
    if (interval.start < start) result.push({ start: interval.start, end: start });
    if (interval.end > end) result.push({ start: end, end: interval.end });
  }
  if (result.length > 0) rows.set(gen, result);
  else rows.delete(gen);
}

function normalize(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const result: Interval[] = [];
  for (const interval of sorted) {
    const last = result[result.length - 1];
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
    else result.push({ ...interval });
  }
  return result;
}

interface Collision {
  base: Interval;
  incoming: Interval;
}

function findCollision(base: Rows, incoming: Rows, dx: number, gap: number): Collision | null {
  for (const [gen, incomingList] of incoming) {
    const baseList = base.get(gen);
    if (!baseList) continue;
    for (const interval of incomingList) {
      const start = interval.start + dx;
      const end = interval.end + dx;
      for (const other of baseList) {
        if (start < other.end + gap && end > other.start - gap) {
          return { base: other, incoming: interval };
        }
      }
    }
  }
  return null;
}

/** Smallest offset at or above `from` at which the block fits. */
function pushRight(base: Rows, incoming: Rows, from: number, gap: number): number {
  let dx = from;
  for (let guard = 0; guard < 10000; guard += 1) {
    const collision = findCollision(base, incoming, dx, gap);
    if (!collision) return dx;
    dx = collision.base.end + gap - collision.incoming.start;
  }
  return dx;
}

/** Largest offset at or below `from` at which the block fits. */
function pushLeft(base: Rows, incoming: Rows, from: number, gap: number): number {
  let dx = from;
  for (let guard = 0; guard < 10000; guard += 1) {
    const collision = findCollision(base, incoming, dx, gap);
    if (!collision) return dx;
    dx = collision.base.start - gap - collision.incoming.end;
  }
  return dx;
}

/** Offset closest to `preferred` at which `incoming` clears `base` on every row. */
function place(base: Rows, incoming: Rows, preferred: number, gap: number): number {
  if (!findCollision(base, incoming, preferred, gap)) return preferred;
  const right = pushRight(base, incoming, preferred, gap);
  const left = pushLeft(base, incoming, preferred, gap);
  return right - preferred <= preferred - left ? right : left;
}

/** Offset that seats `incoming` immediately to the right of `base`. */
function packedOffset(base: Rows, incoming: Rows, gap: number): number {
  let start = Number.NEGATIVE_INFINITY;
  for (const [gen, incomingList] of incoming) {
    const baseList = base.get(gen);
    if (!baseList || baseList.length === 0 || incomingList.length === 0) continue;
    start = Math.max(start, baseList[baseList.length - 1].end + gap - incomingList[0].start);
  }
  if (!Number.isFinite(start)) start = 0;
  return pushRight(base, incoming, start, gap);
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Middle of the range the values span - the visual centre of a row of cards. */
function spanCenter(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return (Math.min(...values) + Math.max(...values)) / 2;
}

function computeBounds(
  persons: PositionedPerson[],
  metrics: LayoutMetrics
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (persons.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return {
    minX: Math.min(...persons.map((person) => person.x)),
    minY: Math.min(...persons.map((person) => person.y)),
    maxX: Math.max(...persons.map((person) => person.x + metrics.cardWidth)),
    maxY: Math.max(...persons.map((person) => person.y + metrics.cardHeight)),
  };
}
