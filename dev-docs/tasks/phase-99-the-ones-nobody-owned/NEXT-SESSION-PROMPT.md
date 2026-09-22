# P99 — next session

**Status: 📋 building. HLT-001–006 ✅, HLT-008 ✅, HLT-010 ✅ (CI job green on Linux, s16),
HLT-011–015 ✅, HLT-017 ✅, HLT-018 ✅, HLT-007 ✅, HLT-016 (a) ✅ (s16) and its index half ✅
(**s17: `where` and `checks`, both engines**).**
Open: **HLT-019 (a ruling on the worked example), HLT-009 (another stream's template), HLT-016 (b)
(waits on the invite-claim question) and AC6 (the DBT stream's).** Nothing in P99 is buildable
without a ruling or another stream. See "Start here".

Read [README.md](./README.md) §5 for the board and §7 for the rules every task inherits, and read
it **before claiming a row**, because peers build this phase in parallel. 🔴 The README in the tree
still carries **the DBT stream's uncommitted HLT-019 row and status-line edit**. s17 committed its
README row twice through a temporary index built from `HEAD`'s copy; never `git add` the file.

## Start here

1. **HLT-019 needs Richard's ruling on [the worked example](./HLT-019-WORKED-EXAMPLE.md).** Unchanged
   since s16, and not asked in s17 (the session built instead). It recommends **no port**: always
   mark the end of `Instructions` with `cache_control` (5-minute TTL), never the API's top-level
   automatic caching, and add `cacheWriteTokens` to Usage. The one cost: ~+24% on the instruction
   tokens of a function called less often than every 5 minutes. **Ask whether that is acceptable,
   or whether he wants a `Cache Instructions` switch defaulting to ON.** Re-read the example before
   asking (a page handed over for a ruling decays). The task file is the DBT stream's.
2. **Tell the DBT stream the index half exists.** Its sprint-49 task (`digital-bricks-training/
   dev-docs/sprints/sprint-49-the-backend-reads/TASK-L169-the-collections-and-the-seed.md` §4) says
   *"NodeGX has no partial unique index"* and lists its CHECKs as *"not enforced"*. Both are now
   declarable: `"where"` on an index, `"checks"` on the collection (shapes in
   [SCALING.md §2](../../../docs/runtime/SCALING.md)). One short message, not an edit to their repo.
   The compound resource rule (label/url/storage key) fits none of the three check shapes.
3. **HLT-009** is in `templates/digital-bricks-training`, which another stream owns: 8 inert
   `width`/`sizeMode` parameters on 2026-09-22. Message that stream before touching a file.
4. If none of those moves, P99 has no buildable row. Say so rather than inventing one; the found-
   beside items below are unowned and each needs a home before anyone builds it.

**Still waiting on Richard from earlier sessions:** HLT-012 AC5 (four frames in `shots/hlt012-*`),
P93 TVW-008 AC7 (`shots/hlt008-fixed-ac7-*`), and the two projects sharing one identity (HLT-011 AC4).

## ✅ What s17 leaves you — HLT-016's index half, both halves, both engines

**Every reading below was taken 2026-09-22.** Commits: `43d5d980e` (`where`), `d26228055`
(`checks`), and the docs commit carrying this file.

- **ACs first.** W1–W8 and C1–C6 were written into the task file (§4b) before any code, from the
  DBT product's real constraints (`digital-bricks-training/drizzle/*.sql`): its partial predicates
  are a boolean, a list, not-null and null; its CHECKs are exactly-one, all-or-none and a range. So
  both are **a structured vocabulary, never SQL text**.
- **`where`** ([verdict](./verdicts/HLT-016/2026-09-22-where/VERDICT.md)): the predicate hashes
  into the index name, so partial and full on the same fields are two indexes. PostgreSQL's
  `parseIndexDef` reads `… WHERE …` back (it made a partial index vanish on restart). Driven over
  HTTP with a restart on both engines; PG conformance 61/61; mutant `drop-where-on-index` caught by
  name.
- **`checks`** ([verdict](./verdicts/HLT-016/2026-09-22-checks/VERDICT.md)): SQLite enforces them
  with BEFORE INSERT/UPDATE triggers (no table rebuild), PostgreSQL with CHECK constraints; both
  raise `CHECK constraint failed: <T>.<chk>`, answered 400 / code 142 with the rule in words. HEAD
  control on both engines: the `checks` key was **silently dropped** and every rule-breaking row
  written. PG conformance 62/62; mutant `skip-checks` caught by name.
- 🔴 **Found and fixed, pre-existing since phase 96:** on PostgreSQL a refused index push answered
  **200**. The schema queue reports failures "on the next data-plane call", and after a push that
  call is the request's own **audit write, which never throws**. `byob-admin.awaitSchemaQueue` now
  waits for the queue. See [[a-deferred-error-surfaces-on-whoever-calls-next]].
- 🔴 **Found and fixed:** upsert would have trusted a partial unique index as cover (now 400), and
  `classPut` answered **404 "Object not found"** for any refusal it did not decode (a broken rule on
  an edit is now 400).
- ⚠️ **Found, NOT fixed, unowned:** (1) SQLite `SchemaManager.createTable` caches the caller's own
  schema object and later writes `indexes`/`checks` onto it. (2) `changeColumnType`'s
  add-copy-drop-rename assumes no index or trigger reads the column; `DROP COLUMN` now refuses (loud,
  rolled back). (3) `schema-migrate.applyIndexes` skips an empty list, so a removed last index never
  promotes. (4) `QueryBuilder.dialect.test.js` uses a fixed table in the shared `nodegx_brg005`, so
  two runs at once collide. (5) A renamed column is not renamed inside an index or check declaration.
- **Gates (2026-09-22, tree = `d26228055`):** `typecheck:runtime`/`contract`/`backend-tests` and
  `tsc -p nodegx-backend --noEmit` exit 0. Backend jest **168/170 suites** with PostgreSQL (2,033
  passed): the 2 reds are `tpl008-theme-drive` / `tpl008-todo-drive`, *"no theme switch is drawn"*,
  red at HEAD since s12. `noodl-runtime` `test/adapters` **313/313** run alone (a concurrent run
  collided on the shared PG table, see (4)). PG conformance 62/62. eslint: the only errors added
  were removed; the `.js` specs carry the same config-level `no-undef` as their FED-002 sibling.
  `test:ci` and the full `noodl-runtime` jest were **not run** this session (nothing outside the
  adapters and the backend changed).

## 🔴 What s16 leaves you — four rulings, three builds, CI measuring for the first time

**Every reading below was taken 2026-09-22.** Commits: `dd0d69f7e`, `74463bfd4`, `1339a3b23`
(HLT-010), `aa0cd5b13` (HLT-007 a), `e5a926d6e` + `c6c72aed6` (HLT-016 a), `260373908` (docs). `cline-dev` was pushed (Richard's ruling).

- ✅ **Pushed, and HLT-010's CI job measured on Linux for the first time.** The first runs were
  `COULD NOT MEASURE` (exit 2), which is the gate refusing to pass a quiet log, as built. Three fixes
  got it there:
  1. The death reason quoted `ErrorBoundary.module.scss`, because it took the first lines saying
     "Error" and webpack names every module. `deathReason` now quotes the death line and the lines
     before it, and the job uploads `dev.log` on failure.
  2. The runner's setuid `chrome-sandbox` aborted Electron (SIGTRAP). `ELECTRON_DISABLE_SANDBOX=1`
     is set on the CI step only, as `run-electron-tests.js:132` does.
  3. **A real product defect:** `jsonstorage.get` answers a MISSING file with the string `'{}'`, and a
     never-signed-in profile sent `Authorization: Bearer {}` to GitHub on every Linux launch.
     `storedTokenOrNull` fixed it. ⚠️ The other two callers of `jsonstorage.get` (`windowBounds`,
     `firstRunLegal`) get the same `'{}'` and were **not audited**. The macOS half (a decrypt error
     logged) is **unmeasured**.

  Run `35712182691`: **PASSED**, every reach arm and sentinel ok. ⚠️ Five other CI jobs (Lint,
  Typecheck, Library check, Node catalog freshness, Lesson bundles) were already red on the
  2026-09-15 run and still are. Nobody owns them.
- ✅ **HLT-007 (a): *Text styles* removed.** 🔴 **I put the question to Richard three times, because §2's
  premise was false and I relayed it twice.** The section is NOT empty. The importer loads
  `textStyles` from `nodegx.styles.json` into the layer it reads: 17 of 19 v2 projects carry them,
  including his own. His ruling, with the true numbers: *"Remove it anyway … You could argue that we
  could convert the existing text styles into Looks … as a compromise."* Conversion is **not built and
  not scoped**. `test:ci` 8/3,036, exactly the floor by name.
  See [[a-project-scan-must-read-both-project-formats]].
- ✅ **HLT-016 (a): only-if-unchanged.** See [the verdict](./verdicts/HLT-016/2026-09-22/VERDICT.md).
  ⚠️ §2 missed that a zero-row UPDATE **without an ACL** answers 200. That is the whole
  cloud-function path, and it is still open for saves without a precondition (unowned).
- 🔴 **A new node port owes THREE regenerations, not one:** `catalog:generate` (→
  `node-catalog.json`), `catalog:merge` (→ `node-catalog-enriched.json`), then `docs:nodes` (→ the
  docs-site page). s16 did only the first, and CI's *Docs site builds (HLT-013)* went red
  (`35715191192`); fixed in `c6c72aed6`. Run `docs:nodes:check` before pushing a port.
- 🔴 **Fixture trap, cost one confused re-run:** the Record node's `Fetched` fires on BIND, before
  any read (P77 D25). Sequence a write after a read on **`Done`**.
- **Tools:** `verdicts/HLT-016/2026-09-22/hlt016.drive.test.ts` drives one route on BOTH engines, with
  a throwaway Postgres DB and an in-process statement log. `hlt016.functions.drive.test.ts` deploys
  graphs as cloud functions and calls them over HTTP. Copy these for the index half.

## 🔴 What s15 leaves you — three piles committed, one defect deeper than its file

**s15 wrote no feature. It committed two uncommitted piles, built HLT-018, and closed the gap in
HLT-007 (b).** Every reading was taken on 2026-09-22 against HEAD `d329cbe42`→`725a82eb4`.

- ✅ **HLT-008's pile is committed** (`e3ef58a82`), unchanged, after re-grading it on today's
  HEAD: `typecheck:editor` + `-tests` exit 0, `test:main` 536/536 · 8,542, `tests-unit/hlt-008`
  22/22, `lint:ci` 873/3916. `test:ci` at 10:25 had the pile in the tree and failed exactly the
  floor by name (3 SUB-006, 3 SUB-011, 2 NDA-017). It was s10's; no session had owned it since.
- ✅ **P93 s29's record is committed too** (`e4fbd62d5`): Richard's own drive of the board (AC7
  NOT WORTHY) and his **R-Z2 ruling, `hover-only`** (TVW-007 §8.5). Both rulings had been sitting
  uncommitted since 2026-09-20.
- ✅ **HLT-018** — [verdict](./verdicts/HLT-018/2026-09-22/VERDICT.md). 🔴 **The file
  under-called it.** On HEAD, `PUT /classes` with `{facts:{}}` answered **200 and wrote nothing**.
  `node:sqlite` takes a bare object passed as the *first* `run()` argument as its named-parameter
  map, so every `?` after it shifts by one and the UPDATE matched 0 rows without throwing. Only
  `buildInsert` threw the 500 the file predicted. ⚠️ And §2 was wrong that PostgreSQL was affected:
  `pg` stringifies a bare object itself, and the new conformance case was green there on HEAD.
- ⚠️ **Unowned, found by HLT-018:** without an ACL, `LocalSQLAdapter.save` reports success on 0
  changed rows. Any UPDATE that matches nothing answers 200. Worth a row if anyone meets it.
- ✅ **HLT-007 (b)** — a peer's uncommitted pile, re-measured and committed. 🔴 **Its spec graded
  the table and never the panel**; restoring the hand-written copy kept every arm green. Now
  `groupForTokenCategory` is the one lookup and three arms grade it, one of them red on HEAD's
  panel.
- 🔴 **A `git show HEAD:<path>` run from a package directory needs `./<path>`.** Once it failed,
  `>` truncated the file it was swapping, and the control run graded an empty module and read
  **`Tests: 0`**. The `cp` backup saved it. Always `test -s` the swapped-in file before running
  the control.
- **Tool:** `verdicts/HLT-018/2026-09-22/hlt018.drive.test.ts`, the HLT-015 harness shape, for any
  backend row. It declares a table through `POST /admin/schema`, then drives `/classes` and
  `/admin/import` on a real socket.
- **Gates at close:** backend jest 166/168 (the 2 reds are `tpl008-*-drive`, *"no theme switch is
  drawn"*, red on HEAD since s12); `noodl-runtime` adapters 295/295; conformance 5/5 suites with
  SQLite + Postgres 58/58 each; `test:main` 536/536 · 8,545.

## 🔴 What s14 leaves you — HLT-017, somewhere to drop it

**Built. The shipped kanban example, driven with real mouse, touch and keys: HEAD 5/5 (nothing lifts
or moves), fixed 43/43, 0 console errors.** [Verdict](./verdicts/HLT-017/2026-09-22/VERDICT.md).

- **Run it:** `node scripts/devtools/drive-hlt017-drop.js` (`--expect head` for the control,
  `--shots <dir>`). It grades the viewer bundle, so rebuild the viewer after any edit to
  `drag-drop.ts` (`cd packages/noodl-viewer-react && npx webpack --config webpack-configs/webpack.viewer.prod.js`).
  The fixture IS `docs/node-catalog/examples/vis-kanban-drag-between-columns.json`. Change the
  example and the drive grades the change.
- 🔴 **§2's "V1 workaround" never existed.** `templates/planner` has 0 `Drag` nodes. AC9 (phase 78)
  is therefore only this: arm the blocks and the Day lists, and wire `Dropped` to `Move block`.
- 🔴 **Count what the frames show.** Two of the three real defects were layout (the gap pushed a card
  out of its column; a gap at the card's own slot moved stacked columns under a finger). Every count
  was green. The `inside` row now grades the first. Look at the pictures before believing a count.
- 🔴 **`signal(node, 'name')` with a misspelt name is silence, not an error** (`hasOutput` guards it).
  `tests/hlt017-drag-and-drop-ports.test.ts` reads every written name from the source and fails on an
  undeclared one. Copy that pattern for any controller that names outputs as strings.
- ⚠️ **`@noodl/mcp` is still 8 red, and not all the same 8:** `nodeDocBudget` is green now. It was red
  on HEAD at 14,315/14,300, and this row added +1,246 (ratchet → 16,200, both attributed).
  `CMP-001 AC2` is red on HEAD at **38** against a pinned 33 and is not this phase's literal.
- ✅ **`catalog:examples` is 109/109.** On HEAD it was 107: two agent examples wired a Text Input
  output named `text`, which does not exist. s14 repointed both to `onTextChanged`.
- ⚠️ **`@noodl/mcp` `provision` + `projectOwnsBackend` flake together and pass apart**, with a
  different spec red each time. They share backend runtime records under parallel workers. It is not
  this phase's, and it is worth a row if CI shows it.
- 📋 **For Richard:** two judgements a one-line revert undoes. Both groups fold into Advanced CSS
  (DEF-029's precedent). The hold ring is `--primary`, because `--accent` is a near-background wash
  in every shipped token set.

## 🔴 What s13 leaves you — HLT-010, the gate exists

**`npm run renderer-errors`: fixed build exit 0 · HLT-001 reverted → exit 1 naming
`react/sync-unmount` 2,978 / 0 · restored exit 0.** [Verdict](./verdicts/HLT-010/2026-09-22/VERDICT.md).

- 🔴 **First thing to check: the `renderer-errors` job's first run on GitHub.** It has only run on
  macOS. If it fails on Linux, read which ARM missed (exit 2) before touching the budget.
- 🔴 **Run it before you close any editor task:** ~2 min compile + ~3 min drive. It refuses to start
  while any dev stack is up, because `start.ts` would reap it. `--log .logs/dev.log` grades a session
  you already have.
- 🔴 **A red reading names the step** (`during "components and node selection"`). To find which
  component, `--inject <file.js>` runs a probe in the renderer after the project opens. s13's probe
  found `PropertyPanelCheckbox` by walking `<input>` React props for `value === null` a tick
  after the warning.
- 🔴 **React's null-`value` warning fires ONCE per session.** Fixing the one a drive names can unmask
  the next; HLT-003 read 0 with this one behind it. Re-run after the fix, always.
- 📋 **Unowned: `NOODLPORT=0` in the renderer** (5 sites read the requested port, not the bound one).
  The gate avoids it with a concrete free port pair.
- 📋 **For Richard:** publishing `{"items":[]}` at `nodegx-content/static/whats-new/feed.json` takes
  the one non-zero budget (`feed.json` 404, ≤ 2) to 0.
- ⚠️ The green reading was taken on a working tree that carries peers' uncommitted P93 edits.

## 🔴 What s12 leaves you — HLT-015, the scanner no longer spends the link

**Built, AC1–6: 3 `curl` GETs + 1 Chrome load → 200, no cookie, no redirect, token row
byte-identical, 0 sessions. HEAD: the 1st GET signed in (302 + `nodegx_auth`), and Chrome met
*"Sign-in link expired"*.** [Verdict](./verdicts/HLT-015/2026-09-21/VERDICT.md).

- 📋 **AC7 belongs to the DBT stream** (its L171: request → SMTP sandbox → curl twice → sign in
  in a browser). It asked to be told when this was committed, and it was told. It is also the
  first *click* on the button: s12's press was a `curl` form POST.
- 🔴 **The email carried the defect's sentence.** The shipped `magicLink` template said *"Anyone who
  opens it is signed in"* in both bodies. A task whose §6 names one doc sentence can have the same
  sentence in the product's own copy. Search for the phrase, not just the doc.
- 🔴 **Backend `jest` is red at 2 suites on HEAD, and they are not this phase's:**
  `tpl008-theme-drive` / `tpl008-todo-drive`, *"no theme switch is drawn"*. They are red with HEAD's
  auth files parked back in (8/9). Somebody's Todo-template theme switch is gone. Name it before
  assuming a red backend run is yours.
- ⚠️ `HttpServer.ts:88` `applyAdminSecurityHeaders` unused. That is a pre-existing eslint error, not
  in s12's hunks.
- ⚠️ **The shell's `grep` skipped `HttpServer.ts` as binary** and read as *"nothing mounts the
  magic-link routes"*. Use `/usr/bin/grep -a` on this package.
- **Tool:** `verdicts/HLT-015/2026-09-21/hlt015.drive.test.ts` + `jest.drive.config.js` drive a real
  `BackendService` on a real socket from `src/` (ts-node cannot resolve `@cloud-runtime`; jest's
  mapper can). ⚠️ Never call `execFileSync` against the server from inside its own process: it
  blocks the event loop the server answers on, and the first run hung for three minutes.

## 🔴 What s11 leaves you — HLT-014, the popup is a dialog

**Built: HEAD 7/7 fired · fixed 25/25 in both layouts · export 14/14, `role` mutant 11/14 ·
templates 18/18 (HEAD 9/18).** [Verdict](./verdicts/HLT-014/2026-09-21/VERDICT.md).

- 🔴 **Show Popup gained `Modal` (default on) — not in §3's decided shape.** AC7 drove every shipped
  use and found the toast prefab opens its toast through Show Popup: a modal toast froze the page for
  three seconds. The toast sets it off. Anything else that uses Show Popup for a notice needs the same.
- 🔴 **`@noodl/mcp` is red on HEAD at 8** — measured in a clean HEAD worktree and again with only
  s11's diff: identical, same numbers. Not this phase's rows; `test:packages` runs it. Name it before
  assuming a red `noodl-mcp` is yours.
- ⚠️ **Tab to the browser UI is not an escape.** With the page `inert`, a Tab past the popup's last
  control leaves the document (`activeElement` reads `body`), as a native modal `<dialog>` allows.
  The drive sorts `page` from `chrome`; the first run scored both as escapes.
- ⚠️ **A hand-written fixture must use the on-disk connection keys** (`fromId`/`fromProperty`).
  `render-from-disk` also accepts `sourceId`/`sourcePort`, the exporter does not — the export arm read
  "nothing opened" for that alone. `scripts/library/drives/harness.js` probes still use the loose form.
- 📋 **Left:** §3.1's validator warning (no name, no heading). A new diagnostic code here owes a corpus
  measurement and an examples row; the image-cropper was its one shipped case, fixed by hand.

## Tools s11 leaves you

- **`scripts/devtools/exported-app-harness.js` — `withExportedPage({ projectDir, transform })`**: the
  first way to DRIVE an exported app that survives a session. Working-tree exporter bundled by esbuild,
  the emitted app bundled by esbuild (router v7 installed once into `$TMPDIR/nodegx-exported-app-deps`,
  React aliased to the checkout's single copy), served, and a page shaped like `withRenderedPage`'s.
  `transform` edits the emitted files first — that is how the mutant arm is made.
- **`drive-hlt014-popup.js`** (`--expect head`, `--body-scroll`, `--export`, `--mutate-role`) and
  **`drive-hlt014-templates.js`** — real mouse and keys over CDP, Chrome's own AX tree for the name
  (`Accessibility.queryAXTree`), and outcomes counted by the GRAPH (a `Counter` per signal).
- **`popup-dialog.ts`** (viewer) and **`src/lib/popupDialog.ts`** (export) — the two copies of one
  contract, graded by one drive. Change one, run the drive in both modes.

## 🔴 What s10 leaves you — HLT-008, the board

**Built: 21/21 driven arms on the fixed build, 9/20 on HEAD** (`scripts/devtools/drive-hlt008-board.js`,
fixture `tvw008-board-fixture.js --out "…/HLT-008 Board"`). [Verdict](./verdicts/HLT-008/2026-09-21/VERDICT.md).

- 📋 **For Richard: P93 AC7** — `shots/hlt008-fixed-ac7-light.png` / `-ac7-dark.png`. Two things
  worth his eye: on the board the scope menu's list heading now reads `Components` (the rows still
  open a component on the Workbench), and in light theme white frames sit on a light board.
- 🔴 **The board's harness set `layout: 'none'` on a Group — no such port** (`flexDirection`). Every
  frame stacked in a column. **HLT-009 is the same class** in a template; the board's harness keys
  are now graded against `noodl-types/src/node-catalog.json` (`tests-unit/hlt-008`) — the pattern
  to copy for any generated graph.
- ⚠️ **A `<webview>` takes every pointer/wheel event over its whole box; `clip-path` on the host
  moves hit-testing too** (measured, both directions). That is how the board gets its gutters back.
- ⚠️ **Capture trap:** `setDeviceMetricsOverride` with `deviceScaleFactor: 1` draws a DPR-2 guest at
  half size in a screenshot. Pin DSF 2 before believing a picture of a `<webview>`.
- **HLT-010 inherits** a half-second `executeJavaScript` poll on the board (guarded; 0 errors across
  every run) — count it if the renderer-error gate ever sees one.

## 🔴 What s9 leaves you — HLT-013, and a docs site that could not build

**Built: 70 "Read docs" presses → 70 × 200 on a driven session; control 78 → 78 × 404.** The
title was wrong — the content origin is alive; the dead thing was every library docs link, plus
the docs site itself (see the [verdict](./verdicts/HLT-013/2026-09-21/VERDICT.md)).

- 🔴 **The pages go live on the next merge to `main`** (`deploy-docs.yml`). Until then
  `npm run docs:verify-origin -- --library-docs` reads **PATH MOVED × 70, correctly**. After the
  deploy it must read 0 — the new `verify` job in `deploy-docs.yml` asks it on its own. If it is
  red after a deploy, that is a real finding, not the pre-deploy state.
- **HLT-010 inherits a new PR job, `docs-site`** (`docs:nodes:check`, `docs:library:check`, the
  site build). Nothing built the docs site on a PR before, which is how a node description broke
  every future deploy for three days unseen. Fold it into HLT-010's accounting; do not duplicate it.
- ⚠️ **Owned, not fixed:** the first "Read docs" press after a reload opened twice on 2 of 4 drives,
  on both builds; not reproduced with stacks armed. §6 of the verdict. Unowned otherwise — if you
  drive a `PrimaryButton` with an `href`, count opens per press.
- ⚠️ **The drive's `ev()` keeps only the LAST LINE of the CLI output.** Return booleans from the
  renderer, never a multi-line string to test in Node — it graded a fixed build as HEAD once.

## Tools s9 leaves you

- **`npm run docs:library` / `:check` / `:import`** — the library reference, assembled from
  `library/<type>/<slug>/README.md` (authored, wins) and `docs-site/imported-prose/` (pinned
  upstream import). Writes `models/libraryDocsPages.ts`, which the card asks. **A README in a
  `library/` entry + `npm run docs:library` is all it takes to give an entry its button back.**
- **`scripts/devtools/drive-hlt013-read-docs.js`** — presses real buttons and **records**
  `platform.openExternal` instead of opening a browser; `--docs-root` grades built-not-deployed pages.
- **`escapeAngles` in `generate-node-docs.js`** — catalog prose is text. `tests-unit/hlt-013`
  scans every generated node page for a raw tag outside code, so a new prose field that forgets it
  fails there.

## 🔴 What s8 leaves you — and the one thing it wants Richard's eye on

**HLT-012 is built: 13 font sizes and 31 spacings offered from the fields themselves, control 0.**
📋 **AC5 is open — four frames in `shots/hlt012-*`.** Two things worth his eye: the affordance is a
`{ }` button inside the numeric field, but on the margin/padding box it *is* the edge glyph (a 60px
field has room for nothing else), so one question has two different-looking answers; and the picker
has **no search box**, because the longest list it can draw is 31 rows.

🔴 **A shared instrument in this phase's drives has a hole, and it cost a run.** `HIT()` accepts
`el.contains(at) || at.contains(el)`. The second arm makes any **ancestor** at the point count as a
hit — so a button 568px below the fold, with its coordinates clamped into the viewport, reported
`hit: true`, the drive pressed the panel background, and the run read a confident **0 tokens
offered** on a build that was working. `drive-hlt012-token-fields.js` scrolls the element into view
and tests `el.contains(at)` only. **The copies in the HLT-001/002/003/005/006/011 drives still carry
the old form**; anything pressing a row inside the property panel's scroller should take the new one.

🔴 **And a top-level import switched OFF two sibling suites.** Adding
`import { StyleTokensModel }` to a file on `marginPaddingEdit`'s import path made
`tests-unit/rel-014` report **`Tests: 0 total`** — 86 specs grading nothing while the runner printed
PASS for everything it could still load. Defer the `require` to call time, the way `Ports.ts`
documents. Run the *sibling* suites after adding any import to a property-editor module.

⚠️ **s8 shipped one surface ungraded and says so: the font-family half.** The font picker now
offers `--font-sans`/`--font-serif`/`--font-mono`, typechecked, reading the same one table — but the
drive presses the numeric rows and the box, and `fontItems.ts` imports `ProjectModel` at module
scope so no plain-Node runner can load it. **The next drive through a Text node owes one arm:** open
Font Family's picker and count the rows under *Design tokens*. Expect 3.

## Tools s8 leaves you

- **`models/StyleTokensModel/TokensForPicking.ts`** (was `ColourTokensForPicking.ts`) — the ONE
  table of which tokens belong on which parameter, colour and non-colour. `PORT_TOKEN_RULES` is
  ordered and the order is the decision; `tests-unit/hlt-012/portTokenRules.test.ts` grades it
  against `node-catalog.json` and pins the seven ports a generic-first rewrite gets wrong.
- **`DataTypes/tokenFieldPopout.ts`** — one opener, three rows. Anything else that wants to offer a
  token from a field calls it rather than growing a fourth copy of the plumbing.
- **`ScrubPortState.isToken`** — the third flag meaning *the parameter is not a magnitude right
  now*, beside `isConnected` and `isExpressionMode`.

## 🔴 What s7 changed for the phase's thesis, and for every drive after it

**HLT-011's defect was not disowned — it was MANUFACTURED by a session's own instrument.** P73
`TUT-001`'s verdict records cloning a launcher store entry so a drive copy would inherit the real
project's backend, id and all. Four phases later that collision surfaced as HLT-003's
duplicate-key warning, and it is still on Richard's disk. ⇒ **A drive fixture is a write to the
user's machine and it outlives the session that made it.** s7's own drive therefore seeds a whole
throwaway profile (`NOODL_USER_DATA_DIR`) rather than adding a row to his store — copy that shape.

## Tools s7 leaves you

- **`scripts/devtools/drive-hlt011-identity.js`** — the first P99 drive whose **arms are two
  builds**, because the data *is* the defect and removing it removes the measurement. It parks the
  changed files, `git show HEAD:<path> > <path>`, drives the control, and copies them back —
  never `git checkout --`, which would take a peer's unstaged work with it. It is also the first
  that drives a **seeded profile**: three fixture projects, two sharing an id, one that cannot
  collide and is clicked first as the known-firing signal beside the reading.
- **`LocalProjectsModel.getProjectEntryWithDirectory`** — the launcher's addressing seam. A row is
  a project directory. ⚠️ `getProjectEntryWithId` still exists and still returns the first match;
  its docblock names the two callers allowed to use it.
- **`findDurableIdCollisions` / `findRowByDirectory`** (`recentProjectRows.ts`) — pure, so the
  properties are graded against the real colliding rows by a plain-Node runner that cannot import
  the model.

## 🔴 The pattern this phase established, five times out of five — and the sixth that broke it

**HLT-001** census (78 sites, not 19). **HLT-002** "detached" webview (hidden, not detached).
**HLT-003** three wrong claims. **HLT-006** §2 (right about enumeration, blind to the echo).
**HLT-004** §2 assumed three responses were mishandled; all three were already handled.

✅ **HLT-005's §2 measured TRUE** — every claim in it held, down to the line number. So the rule is
not "task files are wrong"; it is **measure before you build**, and sometimes the measurement
agrees. ⚠️ What HLT-005 found instead was that its §2's one *dismissal* — "`min-width: 0` cannot
help" — was right about the broken build and wrong as a conclusion about the fix: once the shrink
is restored, `min-width: 0` is the half that stops an unbreakable word.

⇒ **Measure your row's §2 before writing a line.** See
[[measure-the-artefact-before-believing-the-task-file]]. Budget a first hour for it; it has paid
for itself every single time, including the time it came back clean.

## 🔴 What s5 changed for every row after it, and for HLT-010 especially

**A renderer "error" is not necessarily the editor's.** `.logs/dev.log` mixes two populations:

- `Runtime.consoleAPICalled` / `Runtime.exceptionThrown` — **the application's**. These carry a
  `(file.tsx:NNN)` prefix in the log.
- `Log.entryAdded` at level `error` — **Chromium's network stack**, e.g.
  `Failed to load resource: … 401`. Written **before any JavaScript sees the response**, with
  **nothing a `catch` can do about it**, and carrying **no** file prefix.

🔴 **HLT-010 must classify these separately or its budget is nonsense.** A correctly handled 401 on
a route that requires a credential is not a defect, and no amount of error handling will remove its
line — only not making the request will. The distinction is mechanically available: the file prefix.

⚠️ **And `dev-debug.js:120` mirrors BOTH into one file under one `[renderer:error]` tag**, which is
exactly why 264 events looked like 264 application faults.

## Tools s6 leaves you

- **`scripts/devtools/drive-hlt005-comment.js`** — a worked **panel** drive: it drags the side
  panel to its real minimum and maximum through the divider's own gesture (so the clamps in
  `useSidePanelLayout.tsx` are exercised, not bypassed), flips both themes, and takes two
  independent readings of every cell — the element's rect **and** the scrollport's reachable
  `scrollLeft`. Its control is a `<style>` rule rather than a patched module, because **the panel
  remounts between widths** and anything written onto the element is gone by the second reading.
- **`tests-unit/hlt-005/commentBarWidth.test.ts`** — the shape to copy when the consequence is a
  rendered box: jsdom has no layout engine, so the spec grades the algorithm's deciding branch as
  arithmetic over declarations read from the real files, calibrated by a `describe` that requires
  the **broken** declaration to report the defect, and anchored by one that throws *"this spec is
  blind; fix it"* if the containing block it reasons about ever moves.

## Tools s5 leaves you

- **`scripts/devtools/drive-hlt004-requests.js`** — a worked launcher drive. Two independent
  instruments (`performance.getEntriesByType('resource')` and the log), a reach arm, and a control
  that varies **the data in a store** rather than patching anything.
- **`confirmStoredSession()`** (`communitysignin.ts`) — the credential lifecycle. If you need to
  know whether the editor is *really* signed in, this is the one place that asks.
- **`get(path, { credentialed: true })`** in `communityapi.ts` — mark a route that cannot be
  answered without a token and no caller will request it without one. ⚠️ **Only mark routes you
  have MEASURED.** Two are marked; the rest were not measured and guessing turns a read that works
  signed out into one that silently stops.

## 🔴 A sibling stream swept s6's whole commit — use a temporary index here

**HLT-005's twelve files landed inside `228feddb1 "DBT template L164: the roster"`.** The DBT
session committed in the window between my `git add` and my `git commit`, and a pathspec `git
commit` takes **the index**, not the pathspec. Nothing was lost and nothing was rewritten — that
history is shared and a peer commits to it every few minutes — but this phase's register now needs
a sentence to explain a sha.

⇒ **On this checkout, commit through a pinned temporary index with a compare-and-swap**, not `git
add` + `git commit`: `BASE=$(git rev-parse HEAD)`, `GIT_INDEX_FILE=… git read-tree $BASE`, stage,
`write-tree`, `commit-tree -p $BASE`, then `git update-ref HEAD $NEW $BASE` — which **refuses** if
HEAD moved under you. See [[commit-your-delta-through-a-temporary-index]] and
[[staged-files-get-swept-by-a-siblings-commit]].

## 🔴 Three traps s6 paid for — all three printed a verdict first

**Six instrument faults in this phase now.** See [[an-instrument-must-be-armed-before-it-measures]].

1. **`root.querySelector` finds the WRONG `FrameDivider`.** One renders its own `Divider` *after*
   `Container2`, and `Container2` holds the nested one — so the nested divider is first in document
   order. The drive dragged the canvas/preview split while printing the panel's "min" and "max",
   and all four readings came back at the same width. Take the **direct child**.
2. **A fixture that FITS proves nothing in either direction.** A 139-character comment renders
   796px, which fits the 980px scrollport the panel has at its maximum — so the control arm there
   read "no overflow" and was scored a *failure to fire*. A criterion that says min **and** max
   needs a fixture that beats the max.
3. **A missing measurement reads exactly like a clean one.** `Math.max(a, undefined || 0)` is `0`,
   so a run whose panel was blank in every cell printed *"✓ THE NUMBER ... dark-min=undefined"*.
   Assert the **count of cells that produced a reading** before you are allowed to report a zero.

⚠️ **And editing editor `src/` while a drive holds the property panel open crashes it** — HMR
remounts `PropertyEditor` into `Cannot read properties of undefined (reading 'type')` and the error
boundary takes the whole side panel. A hot-reload artefact (a clean reload of the same build drives
34/34), but a drive taken straight after a source edit reads a renderer matching neither build.
**Reload, then drive.**

## 🔴 Three traps s5 paid for — do not re-derive them

1. **`process.exit()` inside a `try` SKIPS the `finally`.** The drive's teardown never ran, and what
   it restores was **Richard's real session file**, which stayed deleted until it was put back by
   hand. A teardown that only runs on the happy path is not a teardown.
2. **A health probe that could never match.** `/ok|renderer|attached/` against `cdp health`'s
   stdout — which is JSON with the keys `url`, `title`, `mountPoint`, `rootChildren`,
   `visibleText`, `reactMounted`, and matches none of those words. It printed *"the editor came up
   — FAIL"* about an editor that was up and had already produced the measurement. **Read
   `reactMounted`.** Fourth instrument fault in this phase.
3. **Deleting a branch can blind another phase's gate.** `useLearnerPath`'s `session === null`
   branch looked like a duplicate once the client held the rule. It is
   `uni-001/session-readers.test.ts`'s **known-firing control**, and the assertion beside it goes
   **vacuous** without it. The spec said so in those words and was right.

## Rules that bit in s5 and will bite again

- 🔴 **Check the `test:ci` floor BY NAME.** 8 failures is the floor *count*; the floor is
  `{SUB-006: 3, SUB-011: 3, NDA-017: 2}`. Read `packages/noodl-editor/tests/test-results.json` —
  its `failures[].fullName` — rather than eyeballing the number.
- 🔴 **A pipe eats the exit code.** Redirect to a file and read `$?`; `${PIPESTATUS[0]}` is bash and
  this shell is **zsh**, where it is silently empty.
- 🔴 **Re-drive after your last source edit.** A control pair taken before an edit proves something
  about a build nobody is shipping.
- ⚠️ **`MEMORY.md` is at its 17,510 budget.** File new findings into a memory that already has a
  pointer, or into a `*-pointers.md` index.

## Gates, both, every time (README §7)

```
npm run typecheck:editor && npm run typecheck:editor-tests
cd packages/noodl-editor && npm run test:main      # 529/529, 8450/8450 after HLT-005
cd packages/noodl-editor && npm run test:ci        # floor: 8 BY NAME — 3 SUB-006, 3 SUB-011, 2 NDA-017
npm run lint:ci                                    # ratchet, 876 vs 3916 baseline
```

⚠️ `typecheck:core-ui` is red at 45 `TS2307` independently of this phase — pre-existing tsconfig
alias condition, no P99 file named.

## Driving

`npm run dev:debug -- --quiet` (background, ~90s warm, ~4min after a source change), then
`npm run cdp -- health`. **Drive a copy** — opening a project writes three files into it.
**`npm run dev:stop` when done**, and announce the teardown to whoever you announced the launch to.
One heavy job at a time. ⚠️ **`node scripts/devtools/stop-dev.js --list` first** to see what a
teardown would reap.
