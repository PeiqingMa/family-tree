# Family Tree

A full-stack web application for managing family trees. Add people, define relationships (parent, child, spouse), and visualize the family tree in table or graph views.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, SQLite (via better-sqlite3 + Knex)
- **Frontend**: React, TypeScript, Vite (coming soon)
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
- `GET /api/tree/ancestors/:id` - Get recursive ancestor tree
- `GET /api/tree/descendants/:id` - Get recursive descendant tree
- `GET /api/tree/graph` - Get all persons and relations (for graph rendering)

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
