# Report: a backend map for a NodeGX app, built from the kit

For the people who made the NodeGX kit. This is the report the skill `nodegx-your-own-editor` asks for. As
asked, it's written here instead of being opened as an issue on `The-Low-Code-Foundation/NodeGX`.

## What was built

`./editor` is a backend editor for `./training` (Digital Bricks Training). You start it with `cd editor &&
npm start`.

- **One canvas** with three columns: the app's 10 screens, its 27 functions and its 27 tables. Wires run
  from a screen to the functions it calls, and from each function to the tables it reads (green) or writes
  (amber). Dotted wires mean the code names a table but the map can't tell how it uses it. Dashed arcs link
  tables whose rows point at each other.
- Each function shows a padlock coloured by who may call it. Each table shows a shield coloured by who may
  open it directly.
- **"Look at it as"** someone not signed in, a learner, or staff. Whatever that person can't reach is
  dimmed, and a sentence says what they *can* reach.
- **"Is it secure?"** is a card of plain sentences. Today it reads:
  - the backend enforces its rules;
  - no table can be opened directly;
  - one function anyone can call, `unsubscribe`, reads and changes rows in People. This is by design, but
    it's the line a client should look at;
  - the backend and the folder agree;
  - nobody can sign themselves up;
  - nobody can reach files directly.
- **What just ran:** the map polls `/executions` every 2 s. A new run flashes its function green (worked)
  or red (refused) and sends sparks along its wires.
- **Taking control:** click a table and choose who may look at its rows and who may change them. A sentence
  says what the choice will mean. "Make it so" then:
  1. sends `PUT /admin/permissions/collections/<T>`;
  2. writes the same entry into `training/nodegx.security.json`, through the kit's `diskFiles` and
     `serializeV2File`;
  3. reads both back;
  4. shows the backend's own dry run (`/admin/permissions/check`) for three people: someone not signed in,
     a learner and a staff member.

  If the file write fails, the backend change is undone. If either the backend's etag or the file's stamp
  changed since the page loaded, nothing is written and the page says why in words. "Back to the app's
  standard rule" undoes a change the same way.
- No JSON appears on screen. The UI test checks this.

**The screenshots** are `./editor-0.png` (the map, live: a run arriving and the safety card open) and
`./editor-1.png` (Progress opened, with a staff-only choice previewed and the backend's dry run). Both
were taken on the real backend at 127.0.0.1:52050. No rule was changed there.

To show a live run in `editor-0.png`, I made **one call to `finishStep` with the admin credential**. The
backend refused it, as BACKEND.md says it will, and recorded it as a run. That one run is the only thing
I added to the real backend. `./training` is unchanged: no file in it is newer than when I started.

## How long it took

About 25 minutes, from 19:48 to about 20:12. That covers reading, building, tests on copies, screenshots
and this report.

## The suite's output (pasted)

```
— the kit's editor suite, on a copy —
PASS — backend map on training (65 ms); files only: the adapter offers no graph runner

— its control: broken on purpose, must FAIL —
FAIL — backend map (broken on purpose) on training (67 ms): 1 difference(s)
1. node "cs_title" in components/Pages/Course/nodes.json: "parameters.fontWeight" is "800"; the official editor saves 800.
```

**Read this PASS for what it is.** The editor makes exactly one kind of change: a table's entry in
`nodegx.security.json`. None of the suite's eight edits is a change it makes, so it ran on an **empty edit
script**, `test/edits-none.json`. The PASS proves three things:

- opening the app through the editor's own path writes nothing;
- what it holds is identical to what the kit's store holds;
- every file it holds passes the structural validator.

It proves nothing about the change the editor *does* make. That is covered by my own tests (below).

It's also **files only**, because the editor has no graph runner.

The first control I wrote **passed when it should have failed.** It wrote the project's `version` as text,
but this project already stores `"version": "4"` as text, so the "break" changed nothing. The control in
`test/suite-adapter-broken.mjs` now breaks a node's number parameter instead, and FAILs as above.

My own checks, all on copies (`npm test`). Each copy is a folder under `editor/test/.work` with its own
backend from `@nodegx/preview`'s `dist/backend/cli.js`. Every one passes:

- **Opening.** Opening writes nothing into the folder.
- **Refusals.**
  - A stale etag is refused, and the page says why in words.
  - A file stamp that changed behind the page is refused the same way.
  - Neither refusal changes anything.
- **The change itself.**
  - The backend obeys the change.
  - The file carries the same entry.
  - Only `nodegx.security.json` changed, and only that one entry. Key order and the final newline are
    kept.
- **Holding.**
  - The change survives a backend restart.
  - A brand-new backend started from the saved folder has the rule.
- **Not-saved warning.** A backend-only change is flagged on the map as "Not saved".
- **Undo.** Going back to the standard rule restores the file byte for byte.
- **The page in Chrome** (installed Chrome, headless, through `puppeteer-core`): click the table → choose →
  "Make it so". The page says the backend obeys and the change is saved, and the copy's backend and file
  agree. The lens sentence is right. There is no JSON on screen and no page errors.
- **The real folder.** `./training` was hashed before and after every run and never changed.

## Questions the page and the kit didn't answer (where I had to guess)

1. **There is no suite for a backend editor.** The skill's "Done means PASS" assumes a graph editor. The
   suite has no edit kind for `nodegx.security.json`, the policy, roles or triggers, and no schema for the
   security file, so `validateStructure` never looks at it. I graded the rule change with my own tests.
   Wanted: an edit kind such as `set_collection_rule`, plus a schema for `nodegx.security.json`.
2. **Does the backend re-apply the project's policy at every start? BACKEND.md and the kit disagree.**
   - BACKEND.md says the backend re-applies `./training/nodegx.security.json` every time it starts.
   - The kit's backend (`@nodegx/preview` 0.2.4, `applyProjectPolicy`) copies the project file only when
     the backend has **no `security.json` of its own**. After that, the backend's own copy wins, and a
     `PUT` alone survives a restart. I measured this on a copy.
   - The running backend is a development build, `nodegx-backend.js` from a checkout, so it may behave
     like BACKEND.md says.

   The editor writes both places, so a change holds either way. Someone should still decide which
   behaviour is meant.
3. **The running backend reads a different folder.** It was started with `--project-dir …/who/training`,
   not `…/who/lab/lab/canvas/training`. That other folder was outside what I was allowed to read. If it
   isn't the same folder (a symlink, say), the file my editor writes is not the one this backend would
   re-read at restart. **Please check this before relying on a change surviving a restart of the real
   backend.**
4. **Refusals at the rule gate are invisible.** An unauthenticated `POST /functions/finishStep` got
   `403`, but it is not recorded in `/executions`, and I found no audit action for it. So "what just ran"
   can't show the most security-relevant event: someone being turned away at the door. The only refusals
   it shows are ones the function makes itself.
5. **What a function touches has to be guessed from its JavaScript.**
   - BACKEND.md says so, and `/health`'s `writesRecords` is wrong for all 27.
   - I read the code: `Noodl.Records.<call>('Table'`, aliases like `const q = (c,…) => Noodl.Records.query(c…)`,
     and `className: 'Table'` in a save's options. A table named some other way is labelled "names it".
   - The kit has `functionScriptPortNames` for a script's ports, but nothing for the records it reaches.
     A `functionScriptRecordTouches(script)` beside it would end the guessing.
6. **Links between tables are guessed from column names.** This app declares no `Pointer`. I link
   `xId` to the table whose single unique key is `xId`, and `userId`/`…UserId`/`createdBy` to `_User`.
   Where two tables have the same unique key (`learnerId` is unique in both LearnerProfile and
   ProjectContext), I pick by name, which is a guess. The map says on screen that these links are read from
   the names.
7. **What makes a call happen is guessed by walking wires.** To say "pressing “Download my data”", I walk
   back from a `CloudFunction2`'s `call` input:
   - until I reach a button's `onClick`, I use the node's `label`. The button's visible text actually comes
     down a Translation wire, so `label` is an author's note that happens to match here.
   - if I reach a Component Inputs node, I say "“Roster” being given its “refresh”".

   Neither the node spec nor the runtime notes say how to find a call's cause.
8. **Groups the rules name but nobody belongs to.** `/admin/roles` lists only groups that exist. On the
   test copy no `staff` group had been created yet, but the functions still say `role:staff`, so my first
   UI test had no "staff" choice to click. The map now offers every group the rules name.
9. **No live feed.** BACKEND.md says to poll `/executions?since=…`. I poll every 2 s and remove
   duplicates by id, because I couldn't tell whether `since` is inclusive. An SSE channel would be better
   (CORS already allows `Last-Event-ID`).
10. **Small kit gaps.**
    - The skill doesn't say whether a non-graph editor should use `@nodegx/canvas-look`. I used its dark
      colours for the ground, wires and category accents.
    - `serializeV2File` is documented as the v2 writer. I used it for `nodegx.security.json` because it
      keeps the final newline, but nothing says it's the right writer for that file.
    - `diskFiles().stamp` is a modification time plus a size. I used it as the file's drift token.

## What I did not do

- **No change to who may run a function.** BACKEND.md describes `PUT /admin/permissions/functions/<name>`,
  and the editor could do it the same way as tables, but you asked for tables.
- **No running the app beside the map.** `npx @nodegx/preview training --open` would do that, but I
  didn't want the editor starting a second backend for the real app. The README says how to watch the map
  while using the app in another window.
- **No deleting the test copies** under `editor/test/.work`. That needed approval, so they're still there.

---

# Round 2: real people, one pathway, one row's reach

You asked for three things in `./editor`, keeping everything that was already there. All three are built,
tested on copies, and photographed on the real backend. They use BACKEND-2.md's mechanism: a key bound to
one person, plus the backend's MCP door. Nothing is simulated.

## What was built

1. **Look at it as a real person.**
   - There is a new **People** column on the far left with the 12 people from the database, and a
     "A real person…" picker in the top bar.
   - When you pick someone, the map asks the backend two things:
     - which functions it offers them (`tools/list` under their key, which runs nothing);
     - whether it would let them open each table (`/admin/permissions/check` with them as the person).
   - Their pathways light up pink. The note at the top says it in words, for example: "As Marie Dubois:
     the backend lets them run 12 of 27 functions and open 0 tables directly."
2. **Follow a pathway.** With a person picked, click a screen. Every function that screen asks for is
   either run **as them** or shown with the reason it wasn't. The real answer is shown the way the screen
   lists it: things, counts and words (`public/render.js`, never JSON). On the map, the screen and its
   functions are coloured by what happened (ran, refused, not allowed, not run), and wires go on to the
   tables the functions that ran touch.

   Measured on the real backend:
   - **Marie's Course:** `course` ran as her and answered her project ("Parent evening booking") and 13
     entries (1 message, 12 lessons), including **her conversation "A question for my coach"**.
   - `learnerProgramme`, `openThreadAsCoach` and `replyAsCoach` are *not allowed* for her, by the backend.
   - `openThread` and `sendMessage` are *not run* because they change data. The panel says so.
   - On a copy, **Jo Whitfield's Course doesn't contain Marie's conversation.**
3. **One row's reach.** Click a table, pick a row, and press "Find who can reach it". For each person:
   - **Directly:** `permissions/check` with that row, for `get` and `find`. Someone not signed in is
     checked too.
   - **Through functions:** every function that touches the table and only reads is run as them, and
     the map looks for the row's ids (its `objectId` and its unique key) in the answer. Required
     arguments come from the row itself when the names match, and the panel says so, for example
     "learnerProgramme asked with learnerId = l-marie, this row's learnerId".

   The answer for Marie's conversation (`conv-l-marie`) on the real backend:
   - **2 of 12 people can reach it:**
     - Marie, through `course` and `exportMine`;
     - Richard Osborne (staff), through `learnerProgramme`.
   - The other ten can't: `course` and `exportMine` answered them without it.
   - Nobody can open it directly, including someone not signed in.
   - On the map, the people who reach it are tagged REACHES IT, with pink wires through the function
     that hands it over to the row. Everyone else is tagged CAN'T REACH IT.

   The panel also lists **what it didn't check**: functions it wouldn't run, and why.

   This answers your example. Would Frank see Sally's conversations? Pick one of Sally's conversations
   and read Frank's line. Note that the staff member reaches any learner's conversations through
   `learnerProgramme`, because that function takes a learner id from its caller. That is by design for a
   coach, and now it's visible.

**Keys and runs, made visibly mine.**
- Each question makes one key per person, named `view-as-<name>-by-backend-map`, and deletes it in a
  `finally`.
- Any leftover map key is swept when the editor starts and when it stops.
- The secret lives in one local variable on the editor's server. It is never sent to the page, logged
  or written. The test checks the whole page for `ngxk_`.
- **Deleting a key revokes it and the backend keeps the record:** 28 revoked map keys are listed on the
  real backend now, and **0 working keys of any kind**.
- Every run made this way shows in "What just ran" as **"run by this map, as Marie Dubois"**, with a pink
  border, and the person's block flashes with the function. The run record doesn't name the key, but the
  audit's `mcp.tool.call` entry does, under the same request id. The map joins the two, so runs made with
  other people's keys are labelled too (for example the `who-probe-…` keys used to measure BACKEND-2.md).

**Real runs I made on the real backend in round 2:** 1 probe of `course` as Marie (a key named
`view-as-probe-marie`, revoked), 2 × Marie's Course pathway (1 run each), and 2 × the reach of
`conv-l-marie` (26 runs each). All of them were read-only functions. `./training` is unchanged: no file
in it is newer than the start of round 1.

**Screenshots**, both on the real backend:
- `./editor-2.png`: the map seen as Marie, with the Course pathway followed and her real answer in the
  panel.
- `./editor-3.png`: the reach of her conversation: 2 of 12, with the pathways drawn.

## Tests (all on copies), pasted

The copy backend now carries the app's whole world: 12 people, the rows and 27 functions. These come from
the app's own `tools/setup-backend.mjs` and `tools/deploy-functions.mjs`, run from the copied folder
against the copy's own backend. It reproduces BACKEND-2.md's measurement exactly.

```
— the kit's editor suite, on a copy —
PASS — backend map on training (675 ms); files only: the adapter offers no graph runner
— its control: broken on purpose, must FAIL —
FAIL — … 1. node "cs_title" in components/Pages/Course/nodes.json: "parameters.fontWeight" is "800"; the official editor saves 800.
— changing who may see a table — all passed
— the page, driven in Chrome — all passed
— round 2: real people, a pathway, one row's reach —
ok    the People column has the 12 people from the database
ok    the lens says, from the backend: "As Marie Dubois: the backend lets them run 12 of 27 functions and open 0 tables directly…"
ok    12 pink pathways light up, one to each function the backend offers her (12)
ok    no working key is left behind after looking (deleted keys are revoked)
ok    clicking Course opens "Course, as Marie Dubois"
ok    course ran as her
ok    her real answer shows: her project "Parent evening booking" and her conversation "A question for my coach"
ok    openThread was not run, and the page says why (it changes data)
ok    learnerProgramme is not allowed for her, as the backend says
ok    the panel says these were real runs, with the key's name (never its secret)
ok    no key secret anywhere in the page
ok    the run shows in "What just ran", marked "run by this map, as Marie Dubois"
ok    as Jo Whitfield, Course does not contain Marie's conversation
ok    "2 of 12 people can reach this row: Marie Dubois, Richard Osborne"
ok    Marie gets it through course and exportMine
ok    the staff member gets it through learnerProgramme, asked with this row's learnerId
ok    Jo Whitfield can't reach it
ok    nobody can open it directly, someone not signed in included
ok    what wasn't checked is listed (openThread, …)
ok    on the map: 2 people tagged REACHES IT, 6 pink pathways
ok    no JSON anywhere on screen
ok    every key the map made no longer works
ok    no page errors
ok    the copy's folder is unchanged: looking writes nothing
ok    the real app folder is unchanged
Everything passed.
```

The kit's suite still grades only the folder, which round 2 never writes, so its PASS says no more
than in round 1.

## How long it took

About 20 minutes, from 20:25 to 20:45.

## What I had to decide, or couldn't know

1. **Which functions may the map run as someone? Only the ones that read.** Running a function as a
   real person is a real run, and some functions that sound like reads write. `openThread` "marks their
   coach's turns read", and `acceptPrivacy` "records" an acceptance.
   - The rule in `lib/asperson.mjs` `runnable()` skips a function when **either** the map saw a write
     in its graph or code, **or** its own description uses a changing verb (save, record, delete, mark,
     send, set, add, publish, copy, stop, accept, …).
   - It's deliberately cautious and it's still a reading of words.

   **Wanted from the backend:** a read-only flag on each function (or a dry-run door). Then this guess
   goes away.
2. **Arguments.** A function's required arguments come from `tools/list`'s `inputSchema`. The map only
   fills ones it can name honestly:
   - the person's own learner id, from their LearnerProfile;
   - the step they're on now, taken from their own `course` answer, for a screen whose functions take a
     `conceptId` (Lesson);
   - for one row, the row's own `…Id` columns.

   Anything else is "not run: it needs X, which this screen gets from somewhere the map can't know (the
   address, or what was clicked)". So a staff member's `learnerProgramme` on the Course screen isn't run,
   because the screen gets the learner from which learner the coach opened.
3. **"Reaches the row" means its ids appear in the answer.** The map looks for the row's `objectId` and
   its unique key. A function that hands over the row's *content* without any of its ids would be
   missed, and the panel's "what this didn't check" says what wasn't run. Functions the map doesn't see
   touching the table aren't run at all.
4. **The plain HTTP door doesn't carry the person**, as BACKEND-2.md says (filed as a backend defect),
   so all person runs go through `/mcp`.
5. **Keys can't expire.** `POST /admin/keys` takes no expiry (I read the backend's `createKey`).
   "Short-lived" is therefore delete-in-`finally`, plus a sweep at start and stop. A crash of the whole
   machine mid-question would leave one working key until the next start. A `ttlSeconds` on keys would
   close that gap.
6. **Deleting a key keeps a revoked record.** After a few questions the API-keys list fills with revoked
   `view-as-…` keys: 28 so far on the real backend. They are harmless, but if that list matters to you,
   a way to purge revoked keys would help.
7. **Admin requests are rate-limited** (300 a minute, bursts of 100). One row's reach makes about 60
   admin requests (keys and rule checks) on top of the map's own polling, and it hit the limit once on a
   copy. The editor's backend client now waits and retries when the backend says "retry in N s", and the
   map reloads every 60 s instead of 30 s.
8. **A run caught while still running** used to read "went wrong" in the ticker. The ticker now asks
   again for the last ten seconds and takes the run's end. That fix came from looking at the first
   screenshot.
9. **Names.** The people's names come from their email (`marie.dubois@…` → Marie Dubois) unless the
   account has a first and last name, as the trainer's does. One account has no email: it's shown as
   "l-invoice (no email)".

## Also changed in round 2

- **The People column** is new on the far left.
- **The safety card starts folded** to its headline, to make room for the people. Click the headline to
  open it.
- **The legend** has a pink "a real person's pathway" entry.
- **Leftover files:** two probes I used while building, `test/probe-copy.mjs` and `test/probe-views.mjs`.
  They are safe to delete; I left them because deleting files needs your approval.
- **Unchanged:** the round-1 features are all still there, and their tests still pass.
