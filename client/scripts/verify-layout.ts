/**
 * Layout invariant checker.
 *
 * The family tree layout has to hold a few properties that are easy to break and
 * hard to eyeball, so they are asserted here against hand-built families:
 *
 *   1. no two cards overlap;
 *   2. one generation renders as exactly one row;
 *   3. spouses sit next to each other;
 *   4. a twice-married person has one partner on each side;
 *   5. children are centred under their parents.
 *
 * Run with:  npx tsx client/scripts/verify-layout.ts
 */

import { buildFamilyModel } from '../src/tree/familyModel';
import { DEFAULT_METRICS, layoutFamilyTree } from '../src/tree/layout';
import type { GraphEdge, GraphNode } from '../src/types';

interface Case {
  name: string;
  focus: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  extraChecks?: (report: Report) => void;
}

interface Report {
  name: string;
  layout: ReturnType<typeof layoutFamilyTree>;
}

let failures = 0;

function person(id: string, gender: 'Male' | 'Female', birth?: string): GraphNode {
  return {
    id,
    names: [{ familyName: 'Test', givenName: id }],
    bioGender: gender,
    lifeFrom: birth,
  };
}

let edgeSeq = 0;
function parentOf(parent: string, child: string): GraphEdge {
  edgeSeq += 1;
  return {
    id: `e${edgeSeq}`,
    fromPersonId: parent,
    toPersonId: child,
    relationType: 'child',
  };
}
/** Same fact, stored the other way round - both encodings must work. */
function childOf(child: string, parent: string): GraphEdge {
  edgeSeq += 1;
  return {
    id: `e${edgeSeq}`,
    fromPersonId: child,
    toPersonId: parent,
    relationType: 'parent',
  };
}
function marriedTo(a: string, b: string, from?: string, end?: string): GraphEdge {
  edgeSeq += 1;
  return {
    id: `e${edgeSeq}`,
    fromPersonId: a,
    toPersonId: b,
    relationType: 'spouse',
    spouseFrom: from,
    spouseEnd: end,
  };
}

function check(condition: boolean, message: string): void {
  if (condition) return;
  failures += 1;
  console.error(`   FAIL ${message}`);
}

function run(testCase: Case): void {
  const model = buildFamilyModel(testCase.nodes, testCase.edges, testCase.focus);
  const layout = layoutFamilyTree(model, testCase.focus);
  const { cardWidth, cardHeight, rowHeight } = DEFAULT_METRICS;

  console.log(
    `\n${testCase.name}  (${layout.persons.length} cards, ${layout.connectors.length} connectors)`
  );

  check(
    layout.persons.length === testCase.nodes.length,
    `every person is positioned (${layout.persons.length}/${testCase.nodes.length})`
  );

  // 1. no overlapping cards
  for (let i = 0; i < layout.persons.length; i += 1) {
    for (let j = i + 1; j < layout.persons.length; j += 1) {
      const a = layout.persons[i];
      const b = layout.persons[j];
      const overlaps =
        a.x < b.x + cardWidth &&
        a.x + cardWidth > b.x &&
        a.y < b.y + cardHeight &&
        a.y + cardHeight > b.y;
      check(!overlaps, `${a.id} and ${b.id} overlap at (${a.x}, ${a.y}) / (${b.x}, ${b.y})`);
    }
  }

  // 2. one generation is one row
  const rowOfGen = new Map<number, number>();
  for (const positioned of layout.persons) {
    const known = rowOfGen.get(positioned.gen);
    if (known === undefined) rowOfGen.set(positioned.gen, positioned.y);
    else check(known === positioned.y, `${positioned.id} breaks the row for generation ${positioned.gen}`);
    check(
      positioned.y === positioned.gen * rowHeight - cardHeight / 2,
      `${positioned.id} sits off its generation row`
    );
  }

  // 3. married couples are adjacent
  for (const marriage of layout.marriages) {
    check(
      marriage.route === 'inline',
      `${marriage.a} and ${marriage.b} are married but not seated together`
    );
  }

  // 4. children centred under their parents
  for (const connector of layout.connectors) {
    const childXs = connector.childPoints.map((point) => point.x);
    const childCenter = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    check(
      Math.abs(childCenter - connector.stemX) <= cardWidth,
      `children of ${connector.parentIds.join('+')} drift ${Math.round(
        Math.abs(childCenter - connector.stemX)
      )}px off centre`
    );
    check(
      connector.busY > connector.stemTopY && connector.busY < Math.min(...connector.childPoints.map((p) => p.y)) + 1,
      `connector for ${connector.parentIds.join('+')} runs backwards`
    );
  }

  const report: Report = { name: testCase.name, layout };
  testCase.extraChecks?.(report);

  const width = Math.round(layout.bounds.maxX - layout.bounds.minX);
  const height = Math.round(layout.bounds.maxY - layout.bounds.minY);
  console.log(`   ${width} x ${height} px, generations ${[...rowOfGen.keys()].sort((a, b) => a - b).join(', ')}`);
}

// ---------------------------------------------------------------------------

const threeGenerationsUp: Case = {
  name: 'Three generations of ancestors, with siblings on every level',
  focus: 'me',
  nodes: [
    person('me', 'Male', '1980'),
    person('sister', 'Female', '1982'),
    person('brother', 'Male', '1978'),
    person('father', 'Male', '1950'),
    person('mother', 'Female', '1952'),
    person('uncle', 'Male', '1948'),
    person('aunt', 'Female', '1955'),
    person('grandfather', 'Male', '1920'),
    person('grandmother', 'Female', '1922'),
    person('maternalGrandfather', 'Male', '1925'),
    person('maternalGrandmother', 'Female', '1927'),
    person('greatGrandfather', 'Male', '1890'),
    person('greatGrandmother', 'Female', '1892'),
  ],
  edges: [
    marriedTo('father', 'mother', '1975'),
    parentOf('father', 'me'),
    parentOf('mother', 'me'),
    parentOf('father', 'sister'),
    parentOf('mother', 'sister'),
    parentOf('father', 'brother'),
    parentOf('mother', 'brother'),
    marriedTo('grandfather', 'grandmother', '1945'),
    parentOf('grandfather', 'father'),
    parentOf('grandmother', 'father'),
    parentOf('grandfather', 'uncle'),
    parentOf('grandmother', 'uncle'),
    marriedTo('maternalGrandfather', 'maternalGrandmother', '1948'),
    childOf('mother', 'maternalGrandfather'),
    childOf('mother', 'maternalGrandmother'),
    parentOf('maternalGrandfather', 'aunt'),
    parentOf('maternalGrandmother', 'aunt'),
    marriedTo('greatGrandfather', 'greatGrandmother', '1915'),
    parentOf('greatGrandfather', 'grandfather'),
    parentOf('greatGrandmother', 'grandfather'),
  ],
  extraChecks: ({ layout }) => {
    const me = layout.personById.get('me');
    check(me?.centerX === 0 && me?.centerY === 0, 'the focus person is at the origin');
    check(layout.personById.get('father')?.gen === -1, 'parents are one row up');
    check(layout.personById.get('grandfather')?.gen === -2, 'grandparents are two rows up');
    check(layout.personById.get('greatGrandfather')?.gen === -3, 'great-grandparents are three rows up');
  },
};

const twoWives: Case = {
  name: 'A man married twice, one child from each marriage',
  focus: 'man',
  nodes: [
    person('man', 'Male', '1940'),
    person('firstWife', 'Female', '1942'),
    person('secondWife', 'Female', '1955'),
    person('firstChild', 'Male', '1965'),
    person('secondChild', 'Female', '1980'),
  ],
  edges: [
    marriedTo('man', 'firstWife', '1962', '1975'),
    marriedTo('man', 'secondWife', '1978'),
    parentOf('man', 'firstChild'),
    parentOf('firstWife', 'firstChild'),
    parentOf('man', 'secondChild'),
    parentOf('secondWife', 'secondChild'),
  ],
  extraChecks: ({ layout }) => {
    const man = layout.personById.get('man');
    const first = layout.personById.get('firstWife');
    const second = layout.personById.get('secondWife');
    const firstChild = layout.personById.get('firstChild');
    const secondChild = layout.personById.get('secondChild');
    check(
      Boolean(first && man && second) && first!.centerX < man!.centerX && man!.centerX < second!.centerX,
      'the two wives sit on either side of the man'
    );
    check(
      Boolean(firstChild && secondChild) && firstChild!.centerX < man!.centerX,
      "the first marriage's child hangs on the first wife's side"
    );
    check(
      Boolean(secondChild) && secondChild!.centerX > man!.centerX,
      "the second marriage's child hangs on the second wife's side"
    );
    const divorced = layout.marriages.find((m) => m.ended);
    check(Boolean(divorced), 'the ended marriage is marked so it can be drawn broken');
  },
};

const cousinsAndRemarriage: Case = {
  name: 'Cousins, half siblings and a shared great-grandparent',
  focus: 'ego',
  nodes: [
    person('ego', 'Female', '1990'),
    person('halfBrother', 'Male', '1986'),
    person('dad', 'Male', '1960'),
    person('mum', 'Female', '1962'),
    person('stepMum', 'Female', '1958'),
    person('auntie', 'Female', '1957'),
    person('auntieHusband', 'Male', '1956'),
    person('cousinA', 'Male', '1985'),
    person('cousinB', 'Female', '1988'),
    person('grandad', 'Male', '1930'),
    person('granny', 'Female', '1932'),
    person('egoPartner', 'Male', '1989'),
    person('kid', 'Female', '2015'),
  ],
  edges: [
    marriedTo('dad', 'mum', '1985'),
    marriedTo('dad', 'stepMum', '1980', '1984'),
    parentOf('dad', 'ego'),
    parentOf('mum', 'ego'),
    parentOf('dad', 'halfBrother'),
    parentOf('stepMum', 'halfBrother'),
    marriedTo('grandad', 'granny', '1955'),
    parentOf('grandad', 'dad'),
    parentOf('granny', 'dad'),
    parentOf('grandad', 'auntie'),
    parentOf('granny', 'auntie'),
    marriedTo('auntie', 'auntieHusband', '1980'),
    parentOf('auntie', 'cousinA'),
    parentOf('auntieHusband', 'cousinA'),
    parentOf('auntie', 'cousinB'),
    parentOf('auntieHusband', 'cousinB'),
    marriedTo('ego', 'egoPartner', '2012'),
    parentOf('ego', 'kid'),
    parentOf('egoPartner', 'kid'),
  ],
  extraChecks: ({ layout }) => {
    const ego = layout.personById.get('ego');
    const half = layout.personById.get('halfBrother');
    const cousinA = layout.personById.get('cousinA');
    check(ego?.gen === 0 && half?.gen === 0 && cousinA?.gen === 0, 'the whole cohort shares one row');
    check(layout.personById.get('kid')?.gen === 1, 'the child is one row down');
  },
};

const brokenAndSparse: Case = {
  name: 'Sparse and awkward data: single parents, an island couple, a cycle',
  focus: 'child',
  nodes: [
    person('child', 'Male', '2000'),
    person('lonelyParent', 'Female', '1970'),
    person('islandA', 'Male', '1950'),
    person('islandB', 'Female', '1952'),
    person('cycleA', 'Male'),
    person('cycleB', 'Female'),
  ],
  edges: [
    parentOf('lonelyParent', 'child'),
    marriedTo('islandA', 'islandB'),
    // Deliberately contradictory: each is the other's parent.
    parentOf('cycleA', 'cycleB'),
    parentOf('cycleB', 'cycleA'),
  ],
};

for (const testCase of [threeGenerationsUp, twoWives, cousinsAndRemarriage, brokenAndSparse]) {
  run(testCase);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll layout invariants hold.');
