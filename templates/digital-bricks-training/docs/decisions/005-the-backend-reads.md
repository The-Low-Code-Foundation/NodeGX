# 005 — The backend reads

_Recorded 2026-09-21, TASK-L169 (sprint 49 in the Digital Bricks Training repo)._

## What changed

The template has a backend. Its schema, its seed and its security policy are files in the project,
applied to a running local NodeGX backend by `tools/setup-backend.mjs`. The pages still read the
fixtures; L170 adds the read functions and L171 swaps the pages onto them.

## Decisions

Richard took seven, 2026-09-21. The full record, with every superseded option, is the sprint index
(`dev-docs/sprints/sprint-49-the-backend-reads/README.md` in the product repo).

1. **The read path first**: no writes and no model calls in this sprint.
2. **The magic link is fixed in NodeGX core** (OpenNoodl HLT-015): today the GET spends the token,
   so a mail scanner signs in before the person does.
3. **A core atomicity primitive before any write** (OpenNoodl HLT-016), *against the
   recommendation* to design around it with one row per fact. It blocks sprint 50, not this one.
4. **SQLite, with a Postgres proof** at the end of the sprint.
5. **The fixtures become one consistent world.** Where a fixture contradicted the product's own
   rules, it was corrected on the fixture itself and the page difference listed (`START-HERE.md`).
6. **The CSV-sanitiser lesson belongs to a second learner**, verbatim.
7. **`/course`'s lesson card follows the product**: it reads the next openable path step.

## What this template does that NodeGX does not do for it

- **Carrying a schema.** A backend keeps collection schemas in its data directory, and nothing in a
  project describes them — so a template cannot be installed from its files alone. `backend/schema.json`
  plus `tools/setup-backend.mjs` is this template's answer. **A candidate core task**: a project-side
  schema file the backend reads on first start, the way it already reads `nodegx.security.json`.
- **An empty object.** `{}` cannot be written to any field (`serializeValue` in the local-sql
  `QueryBuilder.ts` JSON-encodes an object only when it has keys). The setup tool leaves such
  fields off and names the defect.

## What NodeGX cannot express here, stated

The product's CHECK constraints (one scope per session, one scope per brief, one target per prep
item) and its partial unique index on live path steps have no equivalent in an index declaration.
The read path needs none of them. Sprint 50's write functions must enforce them — the index half is
part of OpenNoodl HLT-016.
