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

## Session log

### s3 (2026-10-26): measured, built and graded in the package; publish and pin wait on Richard

**The measurement first** (no Chrome: a todo copy, its own backend, the map's `createEditor` from source). The
backend's tables at start: `[_User]`. After `buildMap()`: still `[_User]`. After `views.people()`:
`[LearnerProfile, _User]`. **The map made the table.** Its "who is signed in" read `GET /api/LearnerProfile` on every
app, and the backend's storage makes any table a query names (`autoCreateTables`). That is where BKO-002's
`t:LearnerProfile` came from. Filed and fixed as **P127-BKO003-PROFILEWRITE**.

**Built** (`dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/`, the package `@nodegx/backend-map`):
- `lib/people.mjs` (new): a column names a person when the schema points it at `_User`, or by name as a fallback
  (`owner`, `ownerId`, `userId`, `createdBy`, `…UserId`). A *profile* table is one whose person column is unique and
  which has a key of its own (the training app's LearnerProfile: userId → learnerId). Only profile tables are read,
  only when the backend has them. `learnerIds` is gone; `views.mjs` and `reach.mjs` take what is known about whoever
  is signed in from `signedInContext` (their id, plus their profile row's key), and `rowIndex` joins through the
  app's person columns, not `learnerId`/`userId`.
- `server.mjs` `buildMap`: each backend source fails alone and is named in `problems` (header: "couldn't read its
  groups"; the safety card says what it left out). Tables the project has and the backend lacks
  (`projectTables`: declared `dbCollections`, the rules file's collections, the tables screens and functions use) are
  drawn with `notOnBackend` and where they came from. Roles come from the backend, its rules and the rules file.
  `personKeys` and each table's `people` columns go to the page. `rows()` labels a row by its first text column when
  it has none of the usual words, and its owner is the first person column.
- The page: "Look at it as" offers *Anyone signed in* and *Someone in the X group* for each group the rules name,
  then the real people ("Nobody has an account yet" when there are none). The note says what that kind of person may
  read, see of their own rows only, and add or change, separately. A table not on the backend is dashed, says "not on
  the backend yet" and what its rule will be. Rule words never repeat ("Anyone signed in or Anyone signed in or
  Nobody" is now "Anyone signed in adds and changes; nobody deletes"; a mixed rule's chip says the same instead of "a
  mixed rule"). "1 thing", "stays dark". Link notes say which links the schema declares and which are read from
  names. An app with no screen and no function draws its tables beside its people, and a person's panel says the
  count comes from the rules alone. The training words are gone: "learner · id" (now the profile key in words),
  "staff" (legend: "one group only"), "the training app's backend" (the app's own name), "(a step, a learner)", the
  `learnerId`/`conceptId` column and title preferences (now: the columns that link to another table; a title falls
  back to the thing's own id, skipping person ids). Path rules have words ("Only people the row is linked to").

**Graded:**
- New `test/any-app.test.mjs`, in `npm test`, **38/38**. Three apps that are not the training app, each on a copy
  with its own backend, in Chrome: the todo template (no row yet: Task is not on the backend), Muddy Paws (a site,
  no table), and "grooming" (Muddy Paws plus a backend shaped like the agent's: `Booking.pet` → Pet and
  `Booking.client` → `_User` as Pointers, one group `groomer` in the rules file, two people, its `/admin/roles`
  refused by a proxy). For each: no training word on the page, the canvas (`window.__canvasWords`) or any of its
  panels; no rule says the same words twice; "Look at it as" offers each kind and each answers; someone not signed
  in and every real person answer; no table is made by looking; no page error. Plus: todo's Task drawn and marked,
  `#t:Task` opens on it with its words; the site says it has no data; grooming draws with its groups refused, reads
  its Pointers as declared links, puts its tables beside its people, and Gwen's panel says the count comes from
  the rules (no function) and claims no runs. Last, by eye on the screens: a screen that reads its tables itself
  says "uses 1 table itself" (it said "asks 0 functions"), and a table with no columns yet shows no empty "What's in
  a row"; the page drives (any-app, ui, people) re-run green after.
- Mutants (in a scratch copy, never the tree), each red: the old LearnerProfile read put back = **4 red** (a table is
  made in all three apps; todo draws LearnerProfile); no table the backend lacks = **2** (Task); no kinds of person
  in the picker = **3**; one failed source blanking the map again = **1** (the grooming map never draws: the drive
  times out); the change rule read as one list again = **4** ("Anyone signed in or Anyone signed in", "The groomer
  group or The groomer group"); the old no-function panel = **1**.
- The suite, whole: **104 checks, all passed** (the kit's suite and its must-fail control, the todo screens test,
  the rule change, the page drive and the round-2 people drive on the training copy, and the new drive).
- AC4, the training copy: on a seeded copy, HEAD and the new source give the same 27 tables, 45 links, the staff
  group, every person's learner id, and Marie Dubois reaches **37 of 289 rows in the same 13 tables**. The public
  recording (nodegx-web `site/backend-map/data`), built by `static/build.mjs` once with HEAD's page and once with the
  new one, in Chrome: the same blocks in the same places, the same wires, people, header line and lens note; the same
  learner (Jo Whitfield) reaches **2 of 289** in both. The words differ only where meant: "learner id l-newstart" (was
  "learner l-newstart"; a recording made before this carries `learnerId`, which the page still reads), "(a row's
  id)", "a copy of Digital Bricks Training's backend", "people are added by whoever runs the backend". Screens:
  `look/bko-003-recording-{before,new}*.png`. Not redeployed: nodegx-web's copy is older than HEAD and is rebuilt
  with the release.

**Against the acceptance list:** AC1 ✅ (the third app is a stand-in shaped like the agent's output, not an agent
run; BKO-006's stranger rounds are the real one). AC2 ✅. AC3 ✅. AC4 ✅ (above). **AC5 half**: the package's tests
pass; **the publish and Studio's pin bump wait on Richard's OTP.** Until then Studio still runs 0.1.1, which makes
LearnerProfile in any app's backend when its map or Privacy is opened.

**Left, on purpose:** `views.mjs`'s `course` pre-run (a function named `course` whose screens need `conceptId`: run
it first and take the step marked `now`). It never fires in an app without that function, so no training word
reaches another app; it stays a training-shaped helper until a screen's own Query / Record nodes are read for
arguments (the table's "read instead"). `reach.mjs`'s `<singular>Id` guess (`session.id` → `sessionId`) is a name
guess for any app, kept. Screens: `look/bko-003-*.png`.
