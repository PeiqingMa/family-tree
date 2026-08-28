# Family Tree

A full-stack web application for managing family trees. Add people, define relationships (parent, child, spouse), and visualize the family tree as a table or as a generational chart.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, SQLite (via better-sqlite3 + Knex)
- **Frontend**: React, TypeScript, Vite
- **Database**: SQLite - lightweight, file-based, no setup required

## Project Structure

```
family-tree/
├── server/          # Express REST API
│   ├── src/
│   │   ├── app.ts          # Express app setup
│   │   ├── index.ts        # Server entry point
│   │   ├── database.ts     # Database initialization
│   │   ├── models/         # TypeScript interfaces
│   │   └── routes/         # API route handlers
│   └── tests/              # Integration tests
├── client/          # React SPA (coming soon)
└── package.json     # Workspace root
```

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: Node.js 22)
- npm 9+

### Installation

```bash
npm install
```

### Development

Start the API server:

```bash
npm run dev --workspace=server
```

The server runs on http://localhost:3001.

### Build

```bash
npm run build --workspace=server
```

### Test

```bash
npm test --workspace=server
```

## API Endpoints

### Persons
- `GET /api/persons` - List all persons
- `GET /api/persons/:id` - Get person with relations
- `POST /api/persons` - Create a person
- `PUT /api/persons/:id` - Update a person
- `DELETE /api/persons/:id` - Delete a person and their relations

### Relations
- `POST /api/relations` - Create a relation between two existing persons
- `POST /api/relations/with-person` - Create a new person and relate them to an existing person
- `DELETE /api/relations/:id` - Remove a relation

### Tree Traversal
- `GET /api/tree/neighborhood/:id?up=3&down=1&collateral=1` - The graph around one
  person, bounded by generation budgets. `up` ancestor generations, `down`
  descendant generations, and `collateral` controls how far the chart descends
  again from each ancestor (1 brings in siblings, 2 also cousins and nephews).
  Returns `{ rootId, up, down, collateral, truncated, nodes, edges }`, where the
  edges are every relation whose two ends are both in the returned node set.
- `GET /api/tree/default-focus` - The person the chart opens on when the client has
  nothing remembered: the best connected person, oldest first on a tie.
- `GET /api/tree/ancestors/:id` - Get recursive ancestor tree
- `GET /api/tree/descendants/:id` - Get recursive descendant tree
- `GET /api/tree/graph` - Get all persons and relations

## Family tree chart

`Tree View` draws a poster-style generational chart around one person.

- The person in focus sits in the middle of the screen with three generations of
  ancestors above them by default; the depth up and down is adjustable.
- One generation is always one row, and no two cards can overlap - the layout
  packs every block against the space already used on each row instead of
  repairing collisions afterwards.
- Children hang on a bracket centred under the couple they belong to, and each
  marriage's children hang under that marriage, so somebody married twice has one
  family on their left and one on their right.
- Clicking a person, or dragging them into the middle of the view, makes them the
  new centre and loads their own relations. The last person viewed is remembered.

The layout is pure, framework-free TypeScript in `client/src/tree`
(`familyModel.ts` normalises relations, assigns generations and groups couples;
`layout.ts` positions everything). Its invariants are checked by:

```bash
npx tsx client/scripts/verify-layout.ts
```

## Data Model

### Person
- Multiple names (family name, given name, middle name, full name, name type, name order)
- Bio gender (Male, Female, Other, Unknown)
- Social gender
- Life from / life end dates
- Birth place / death place
- Details (free text)
- Photos (list of URLs)

### Relations
- **Parent**: sub-types BioFather, BioMother, FosterFather, FosterMother, Unknown
- **Child**: sub-types Bio, Adopted
- **Spouse**: with optional from/end dates

## License

See [LICENSE](LICENSE) for details.
