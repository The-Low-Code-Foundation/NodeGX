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
