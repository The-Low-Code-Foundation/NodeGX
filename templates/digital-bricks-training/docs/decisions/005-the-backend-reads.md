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

## TASK-L171 — the pages read the backend (2026-09-23)

The three `Data/Fixture *` components became `Data/Lesson`, `Data/Programme` and `Data/Roster`: a
`Cloud Function` in front of the same split, the same outputs (Data/Lesson appends one, `found`).
The fixtures moved to `backend/fixtures/`, where the seed and the checks read them. `/course`,
`/lesson`, `/people` and `/learner` are **byte-identical** to the fixture-fed build — on SQLite, and
again on PostgreSQL 16 after `migrate`, with no file changed between the two runs.

Two more decisions, Richard's, 2026-09-23, both as recommended:

8. **Home keeps both doors, each prefilling sign-in with its demo address.** That puts one staff
   address in the graph, as a prefill that decides nothing; staff is the backend's `staff` role.
   *Not chosen:* one Sign in button; two doors that do the same thing.
9. **Palette keeps a specimen** (`Data/Specimen lesson`), written by `build-seed.mjs` from
   `backend/fixtures/lesson.json` and held byte-identical by `check-specimen.mjs`. A kit's showcase
   must not depend on who is signed in. *Not chosen:* Palette signs in and reads Sam's lesson.

What reading the graph forced: `/lesson` takes `?concept=` (it never had to say which lesson) and
says *not written yet* when there is none; `/learner` takes `?learner=`; one gate in `App`
(signed out → sign-in, signed in without `staff` → Home from the coach's pages).

What the move found, in NodeGX rather than here — both reported, neither fixed in the template:

- **`POST /oauth/exchange` returns the user without `roles`**, though its own docblock says it is
  the same shape `/login` returns and `/login` carries them. After a magic link, the page cannot
  tell a coach from a learner until it asks. The gate asks once.
- **An Object field reads back with its keys reordered on PostgreSQL** (`jsonb`), and `migrate`'s
  comparison ignores key order. Visible here only in the order of *What they have told us* — which
  is also the order the product, on `jsonb`, has always shown.

And one in this template, from L170: a NUL byte used as an empty-list sentinel, harmless on SQLite
and a 400 on PostgreSQL.
