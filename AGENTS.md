# AGENTS.md

Guidance for AI agents working in this repository. Read this before changing code.

## What this is

A family tree app: an Express + SQLite REST API and a React + Vite single-page
client, wired together as npm workspaces.

```
server/          Express API, TypeScript, SQLite via Knex + better-sqlite3
  src/routes/    persons, relations, tree, auth, users
  src/models/    shared TypeScript interfaces (the data contract)
  tests/         supertest integration tests against an in-memory database
client/          React SPA
  src/components/  one file per screen or widget
  src/tree/        the family tree layout engine (pure, no React, no DOM)
  src/i18n/        en.json and zh.json
  scripts/         standalone checks
```

The root `package.json` only declares the workspaces and has no scripts, so
always target a workspace.

## Commands

```bash
npm install                              # once, from the repo root
npm run dev   --workspace=server         # API on http://localhost:3001
npm run dev   --workspace=client         # Vite on http://localhost:5173, proxies /api
npm run build --workspace=client         # tsc -b && vite build - use this as the typecheck
npm run build --workspace=server
npm test      --workspace=server         # jest
npx tsx client/scripts/verify-layout.ts  # family tree layout invariants
```

The server has supertest integration tests covering the persons and relations
routes; they should be green before and after your change. There is no test
runner or linter on the client, so treat `npm run build --workspace=client` as the
gate there: `tsconfig.json` is `strict`, so a clean build is meaningful.

The SQLite file lives in `server/data/` (gitignored) and is created on first
start, together with an `admin` / `admin123` user. Delete the directory to reset.

## The one thing that trips everybody up: relation direction

There is a single `relations` table holding a direction *and* a type, and the same
fact can be stored either way round:

| Row | Meaning |
| --- | --- |
| `(from=A, to=B, 'parent')` | **B is a parent of A** (from = child) |
| `(from=A, to=B, 'child')` | **B is a child of A** (from = parent) |
| `(from=A, to=B, 'spouse')` | symmetric |

Any code that reads relations must handle both encodings; see
`buildAdjacency` in `server/src/routes/tree.ts` and `buildFamilyModel` in
`client/src/tree/familyModel.ts`. The duplicate check on `POST /api/relations`
only rejects an exact repeat of the same triple, so the reverse encoding of an
existing fact does get stored - deduplicate by unordered pair when reading.

When keying an unordered pair, never join ids with `-`: ids are UUIDs and already
contain it. Use `\u0000` (see `pairKey`).

## Conventions

**Database and API.** The database is `snake_case`, the API is `camelCase`. Map
explicitly in the route, do not leak row shapes. Dates (`lifeFrom`, `lifeEnd`,
`spouseFrom`, `spouseEnd`) are free text, so they may be `1920`, `1920-05` or
`1920-05-03` - never `new Date()` them, compare or slice the strings.

**Ids.** Primary keys are UUIDs from `randomUUID()` in the built-in `node:crypto`.
Do not add a uuid package for this: the last one to be added was ESM only, which
broke the whole Jest suite, and the standard library already does the job.

**Auth.** `authenticateToken` runs globally and only populates `req.user`. Reads
are public; guard mutations with `requireAuth`, and user administration with
`requireAdmin`.

**Translations.** Every user-facing string goes through `t()`. `en.json` and
`zh.json` must be changed together and keep the same key structure - a key
present in only one file silently falls back to English. Never format a person's
name by hand; use `getDisplayName` / `getNameDisplay` from `client/src/utils.ts`,
which handle the `fullName` override and the Chinese name order.

**Family tree layout.** `client/src/tree` is deliberately free of React and DOM
code so it can be checked in isolation. Any change there must preserve:

1. no two cards overlap;
2. one generation renders as exactly one row;
3. spouses stay adjacent, and a person married more than once has partners on
   both sides with each marriage's children below the matching partner;
4. children hang centred under their own parents, in-laws excluded.

`client/scripts/verify-layout.ts` asserts all of these. Run it after touching the
layout, and add a case there rather than only checking by eye. Overlaps are
prevented by packing blocks against the space already occupied on each row - if
you find yourself writing a pass that pushes cards apart afterwards, the change
is going in the wrong direction.

**Components.** Function components with hooks, no class components, no state
library - `useState` plus context (`AuthContext`) is the whole pattern. Styling is
plain CSS in `client/src/index.css`, class names namespaced per feature (`ft-` for
the family tree); there is no CSS-in-JS or utility framework.

## Working agreements

- Branch off `main`, never commit to it directly unless asked.
- Conventional commit subjects (`feat:`, `fix:`, `refactor:`, `docs:`), imperative
  mood, and a body explaining the behaviour change rather than listing files.
- Do not commit `server/data/`, `dist/`, or `*.tsbuildinfo`.
- Prefer extending an existing route or component over adding a parallel one; if
  a screen is being replaced, delete the old file and its now-unused
  dependencies in the same change.
- Verify before claiming success: build the workspace you touched, and exercise
  the actual behaviour (an endpoint call, a browser interaction) rather than
  relying on a command exiting zero.

## Dependencies

Jest runs the server tests through the CommonJS runtime, which cannot `require()`
an ESM-only package even though plain `node` can. Before adding a runtime
dependency to the server, check that it ships a CommonJS build, or the test suite
will stop loading entirely. Prefer the standard library where it suffices.
