# BKO-003 — The map reads any app, not the training app

**Phase:** [127](README.md). **Package:** `@nodegx/backend-map` (source `dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/`,
"E/" below). Board lane 6 already lists this ("backend-map generic"); this task is that row.

## What assumes the training app (read 2026-10-26)

| where | what it assumes | read instead |
|---|---|---|
| `E/lib/asperson.mjs:121-129` | "who is signed in" maps userId → learnerId through a fixed `LearnerProfile` table | `_User`, plus the columns in `dbCollections` that point at the user |
| `E/lib/views.mjs:115-130,190-200` | a function named `course`, an arg `conceptId`, `state === 'now'` | the screens' own Query / Record nodes and the functions they call |
| `E/lib/reach.mjs:60-61,87` | joins only through `learnerId` / `userId`, and only for tables with ≥3 rows; parent key → `<singular>Id` | Pointer / relation columns from the schema; name guesses only as a labelled fallback |
| `E/lib/project.mjs:285-318` | links guessed from `xxxId` names | the same: schema first |
| `E/server.mjs:167,173` | fixed label columns and owner columns | the schema's first text column; the column the security rule names as owner |
| `E/public/render.js:6`, `app.js:1434` | `TITLE_KEYS` and preferred columns include `conceptId`, `learnerId` | as above |
| `app.js:29,773,818,828,1307,1334,1367,1387`, `index.html:42` | the words "staff", "learner", "the training app's backend" | the app's roles from `nodegx.security.json`; "a signed-in person" where it has none |
| `E/server.mjs:69,90,121-127` | tables from `/admin/schema` only; roles from `/admin/roles` + rule strings | also the project's `dbCollections` and `nodegx.security.json` roles, with a table the backend lacks drawn as "not on the backend yet" |
| `E/server.mjs:68-76` | `Promise.all` with no catch: one failed call blanks the map and retries every 4 s | each source fails alone and says which |
| `app.js:156-191` | four fixed columns | fine as a default; check it on 2, 8 and 26 tables |

**Seen in BKO-002's gate (s2, 2026-10-26, the todo copy, Studio's pinned 0.1.1):**
- `window.__map.byId` held `t:_User` and **`t:LearnerProfile`**, a training-app table the todo app never had. The
  header said "3 tables" where the backend has two.
- A type in the project and not yet on the backend (Task, before its first row) has no node, so Privacy's "See it on
  the map" opens the map on nothing (`focusOn` returns silently). That is AC3.
- Task's story read "Changing directly: Anyone signed in or Anyone signed in or Nobody" (one rule per operation, not
  merged) and "1 things in each row". Studio `docs/look/bko-002-map-on-task.png`.
- Studio's `editor/hosted-check.mjs` is a ready harness for this task: it draws the map for any template copy.

Studio pins **0.1.1**, which is older than the source. The installed copy still says "A signed-in learner"
(SCOPE.md:1454).

## Acceptance

1. Three apps that are not the training app draw with no training word on screen: the todo template, Muddy Paws, and
   one app made fresh by the agent with a Pointer column and one role. Screens go in `look/`.
2. "View as" works on each app's own people: a role from the security file, a signed-in person, nobody.
3. A table in the project and not on the backend is drawn and labelled. A failing `/admin/roles` leaves the rest of the
   map up.
4. The training copy still draws as it did: the public recording at nodegx.io/backend-map/ is the control.
5. The package's own tests pass. Publish, then bump the pin (Richard's OTP).
