# Next session — session 100 (2026-09-26) BUILT §75: the four parsers (`Parse CSV`, `To CSV`, `Parse XML`, `Parse Feed`) — picker **118 → 122 of 130 (93.8%)**, the first move on the headline number since GAM-013. Richard's ruling this session: *"Can we not finish the code export nodes? If we had 100% coverage that would be a big deal"* — **every remaining picker row is a target now**; §50.3's exclusion list is reversed (EXP-011 §3 and §50.3 amended, §75.0).

**Session 100's commit: `fcf68a1c7`** (feature); this handoff's own commit follows it.

## 🔴 Read this first — Richard, 2026-09-02: *"Stop fucking up the CPU."*

One heavy job at a time on this 16 GB box. Session 100 ran single specs, ONE whole-package jest (13 files red, all pins/goldens this
section moves, each counted first), a 14-file rerun, package tsc, the ledger gates and the dist build — and did NOT run the editor
tsc or `test:ci`, because a peer's headless Chrome drive held the box at load 16–22 for the whole gate window. **The next session owes
those two before it builds** (the editor's webpack typechecks this package's tests: `the-editor-test-ci-webpack-typechecks-a-sibling-packages-tests`).

## The board, re-derived from the task files

| task | status |
|---|---|
| EXP-001 `@nodegx/core` | ✅ Published `0.1.0` (4 `0.1.1` rows carried) |
| EXP-002 / 003 / 005 / 006 / 007 | unchanged |
| EXP-004 | 🟡 built + driven; drill-down panel + the comprehension test remain (Richard's); §69.4 #1 |
| EXP-008 | ✅ `export-ledger:check` OK — **180 types, 129 translated, 33 deferred, 1 stubbed, 17 backend-only**. 🔴 Open: no per-parameter coverage (§75.5 #3 restates it — do not quote 100% without it) |
| EXP-009 / EXP-010 / EXP-012 / EXP-013 | 🟢 |
| EXP-011 picker coverage | 🟡 **122/130 (93.8%)** — §75 built the four parsers. **8 left, ALL targets by the 2026-09-26 ruling**: Pattern Extractor, Action Dispatcher, Action Handler, State Snapshot, State History, Undo / Redo, Optimistic Update, Sign In With |
| EXP-014 / 015 / 016 / 017 | 🟢 |

## What session 100 did (EXP-011 §75 — read it; this is the summary)

1. **Measured the shape first.** The four parsers re-parse on every arrival and hold nothing else — Tier 2.7's `util-call`, with
   SEVERAL value outputs each, so `UTIL_NODES` gained a trailing-selector field (`select: true`, `DATE_NODES`' idea) rather than the
   export gaining a kind. `Pattern Extractor` is NOT this shape (outcome-token action with `Found`/`Not Found` — `Hash`'s family, §59)
   and was deliberately left for its own section.
2. **`src/emit/parseLib.ts` → emitted `src/lib/parse.ts`**: `csv.ts`, `xml.ts`, `feed.ts` and the four node files transcribed; one
   helper per node answering the output named by its last argument; a one-entry memo per helper; typed overloads (`any[] | undefined`
   for a list, `number` for a count, `unknown` where it can be undefined). Generated from a real `.ts` file (typechecked strict, graded by
   the differential) into the string-array shape.
3. **The dependency decision the `Parse XML` ledger row said to take first — taken (§75.2):** the exported `package.json` earns
   `fast-xml-parser: 4.5.7` (the interpreter's exact pin) when a component calls `parseXml`/`parseFeed`. First third-party dependency an
   emitted lib has declared. `typecheckApp.ts` resolves it for real. Richard can overrule; the reasons are in §75.2.
4. **Plan/emitter clauses:** selector appended; `Changed`/`Failure` defer with the date family's recomputation sentence; `required`
   port unwired+unauthored defers with `dateReadExpr`'s sentence; a parser's code-editor text (`script` param) read as the literal it
   is; `To CSV` admitted as a named array's list reader; a parser's list output kept OUT of Pass 4c's `LOGIC_VALUE_OUTPUTS` so Pass 5 §4e
   binds it to a For Each; `listExprFields` knows a feed's twelve fields; the util import split by module; `withDependencies`.
5. **The one divergence, reported where it can happen:** on a failed parse the interpreter keeps the previous answer beside the Error,
   the pure call cannot — noted at a parser whose text is WIRED, never at a literal.
6. 🔴 **Found by the differential, not by reading: `feed.ts:365` hashes with a NUL byte** (a literal U+0000 between the quotes, drawn as a
   space). The emitted module writes `'\u0000'`; §A pins the runtime byte. Registered §75.5 #1, owner NONE, product side — **tell Richard**:
   a "fix the odd character" edit in the runtime silently re-mints every hash-rung feed id FED-002's index keys on.
7. **`tests/the-parsers.test.ts` 25 rows** (§A differential over 120 CSV cells, 16 To CSV shapes, every runtime XML/feed fixture × 3;
   §B translation rows and five refusals by sentence; §C `tests/fixtures/sheet-desk` typechecked whole). Ledger: 4 rows → translated,
   floor 118 → 122, twelve pins moved, subscribe-to-changes F2 rewritten (no scheduled row remains — pinned empty), relation-verbs'
   untranslated-feeder example is now `Pattern Extractor`, HLS-001 golden regenerated (49 README hashes + the new project, counted first).

## Uncommitted at hand-off

Nothing of session 100's after its commits (see `git log`). PEERS' work, untouched and heavy: `dev-docs/tasks/phase-78-the-templates/**`
(TPL-011 nightbook, a 600-file pile incl. `templates/planner-demo` deletions), `packages/nodegx-backend/tests/**`, `packages/noodl-mcp/tests/**`,
`scripts/devtools/drive-*.js`, `package.json`/`package-lock.json`. 🔴 Commit through a temporary index with pathspecs; never plain `git commit`.

## 🔴 Do this next (BUILD) — the order is by what a refusal silences and by runtime size

0. **Owed gates first:** editor `tsc -p tsconfig.json --noEmit` and editor `test:ci` on this tree (see the CPU rule above).
1. **§76 `Pattern Extractor`** — `Hash`'s shape (§59 `CRYPTO_NODES` / `crypto-call` / `crypto-out`), generalised: seven value outputs
   (`match`, `matches`, `groups`, `firstGroup`, `namedGroups`, `matchCount`, `error`), the outcome pair (`done`/`failure`, code
   `pattern-extractor/extract-failed`), PLUS `found`/`notFound` — two result pulses off one Do. Runtime: `agent/pattern-extractor.ts` +
   `agent/stream-parsers.ts` (`extractPattern`). One session; the crypto table's `node` union and single `output` are what have to widen.
2. **§77 `Action Dispatcher` / `Action Handler`** (`agent/action-dispatcher.ts` 963 + `actiondispatchernode.ts` 673 lines) — an in-app
   bus; read `Send Event`/`Receive Event`'s translation first, it is the nearest shape.
3. **§78 the history family** — `State Snapshot`, `State History`, `Undo / Redo`, `Optimistic Update` (`statesnapshotnode.ts`,
   `statehistory.ts`, `undonode.ts`, `outcome.ts`). Two sessions; stateful.
4. **§79 `Sign In With`** — the §48 reason ("waits on a provider decision") is STALE: `nodegx-backend/src/auth/github.ts` exists and
   `RestAuthAdapter.signInWithProvider` is implemented. Needs a drive of the redirect's return leg (`_consumeAuthReturn`) against the
   real backend, not a spec alone.
5. **Before anyone quotes 100%:** EXP-008's per-parameter coverage question (§75.5 #3) — one session on a per-parameter ledger check.
6. Still queued from s99: §74.5 #1 (the `unknown`-into-a-typed-store-key sink), §69.4 #1 (the cascade sentence), §71.5 (Richard's ruling).

---

## Earlier hand-off (session 99), kept for the record


## 🔴 Read this first — Richard, 2026-09-02: *"Stop fucking up the CPU."*

One heavy job at a time on this 16 GB box. Session 99 ran single-spec jest for the rows and the
15 arms, then **one** whole-package run (repeated once, after the corpus golden and four pins moved
under it), the drive (one `npm install` shared by both arms through a symlinked `node_modules`, two
builds, two `vite preview`s and one headless Chrome, all torn down by port the moment the readings
were taken, the worktree `git worktree remove`d), the editor tsc, and `test:ci` — and **waited for a
peer's `jest tests/tpl007Engine.test.ts` at 99% CPU to finish before starting `test:ci`**.

## The board, re-derived from the task files

| task | status |
|---|---|
| EXP-001 `@nodegx/core` | ✅ Published `0.1.0` (4 `0.1.1` rows carried) |
| EXP-002 / 003 / 005 / 006 / 007 | unchanged. ⚠️ EXP-002-TARGET-OUTPUT §1 (PuppyCard) and EXP-002-VISUALS-TARGET-OUTPUT's Image/Video rows were rewritten by s99 |
| EXP-004 | 🟡 built + driven; drill-down panel + the comprehension test remain (Richard's); §69.4 #1 (the cascade sentence on the node in front) |
| EXP-008 | ✅ `export-ledger:check` OK — 176 types, 124 translated. 🔴 Open question from EXP-014 AC5: no per-parameter coverage — §14.5 is the FOURTH parameter gap found green behind a `translated` row |
| EXP-009 / EXP-010 / EXP-012 / EXP-013 | 🟢 |
| EXP-011 picker coverage | 🟡 **117/127 (92.1%)** — every scheduled tier built and driven; the 10 left are §50 out-of-scope RULINGS. §74.5 #1 still open |
| EXP-014 the ground | 🟢 built s97; **§14.5 CLOSED s99**; one runtime-side residual in its place, §14.6, owner NONE |
| EXP-015 / EXP-016 | 🟢 |
| EXP-017 the deploy engine | 🟢 built + gated s98 (AC4's duplicate deliberately narrowed — read the file before re-opening) |

## What session 99 did

1. **Re-measured the register and found it right but smaller than the surface** — two ways. The
   register named four ports; `renderIcon` printed a picture icon's source verbatim too (five). And
   it named the LITERAL channel, where the landing-pages template carries **2** literal `Image.src`
   and **~18** pictures through `Static Data` rows wired into a card — the wired path is the product.
2. **`src/emit/mediaLib.ts`**: `absoluteUrl` = the runtime's `getAbsoluteUrl` (base `/`); `mediaSrc` =
   the viewer's `resolveMediaSource` in front of it (`null`/`undefined`/`''` ⇒ NO attribute — `src=""`
   refetches the document); `mediaSrcSet` = the HTML `srcset` tokeniser (a comma inside a `data:` URI
   survives); `MEDIA_ATTRS` keyed by ATTRIBUTE like `ATTR_SINK`; `mediaLibSource()` the same three as
   emitted text. `contentAttrs`: a literal resolved at emit time, a wire printed `src={mediaSrc(x)}`
   with the import set AFTER the render (imports join after `jsxLines`); the icon takes `absoluteUrl`
   because the runtime's `iconImageSource` setter has no empty gate. `emitApp` ships the module iff a
   component named a helper.
3. **`tests/fixtures/picture-desk`** — the first corpus project two segments deep (`gallery/team`),
   with four real SVGs in its module folder so the drive can fetch them; **`tests/the-picture-path.test.ts`
   26 rows**, §E transpiling the emitted module beside the package's functions over one table, §F the
   reverted arm as Node's WHATWG `URL` reading; **15 arms, 15/15**.
4. **Counted before any golden moved**: 9 hashes in the three corpus projects with a wired picture
   (`gallery-desk`, `photo-desk` off a Cloud File's https `url` — passes through untouched, as the viewer —
   and `puppy-test-3`) + 3 `src/lib/media.ts`, **zero in the other 42**. The HLS-001 golden regenerated
   with that count in its comment (45 → 46 projects), the PuppyCard golden in `visual.test.ts` and its
   twin in EXP-002-TARGET-OUTPUT §1 moved by the same two lines, the two Cloud File pins re-pointed,
   the ledger's Image/Video notes corrected.

## The gate chain — READ on this tree

**whole pkg jest 101 files (101 on disk) 3491 passed / 1 skipped exit 0** (run twice — the second after
the golden and pins moved) · **package `tsc --noEmit` exit 0** · **editor `tsc -p tsconfig.json --noEmit`
exit 0, empty log** · **`export-ledger:check` OK — 176 types, 124 translated** · **picker 117/127
exit 0** · **editor `test:ci` 2983 specs, 0 failures, exit 0** (seed 42557; `tests/test-results.json` fresh; `.webpack-cache` cleared first; HEAD `ae2574f2`) — ⚠️ the AIX-006 ×4 floor s97/s98 recorded is GONE on this tree: 0 failures, so the floor by name is now 0. **Drive**: reverted worktree (`git worktree add --detach HEAD` + the fixture
copied in) vs this tree, both `tsc -b` 0 and `vite build` 0 (48 vs 49 modules — the module), served on
4173/4174, one headless Chrome at `/gallery/team`: local pictures **0/4 → 4/4 decode**, poster
`/gallery/…` (`text/html`) → `/noodl_modules/…` (`image/svg+xml`), `src=""` → no attribute, errors `[]`
both. Pictures `drive-before.png` / `drive-after.png` in the s99 scratchpad `736ed0fd-…`.

## Uncommitted at hand-off

Nothing of session 99's after its two commits (feature, docs — see `git log`). PEERS' work, untouched:
`dev-docs/tasks/phase-78-the-templates/**` (TPL-007), `library/prefabs/form-fields/project/project.json`,
`library/modules/game-kit/`, `packages/noodl-mcp/tests/tpl007*`.

## 🔴 Do this next (BUILD)

1. **§74.5 #1 — the `unknown`-into-a-typed-store-key sink.** `mood.set({ theme: ghost.get() })` where
   `theme: string` is TS2322 in the built app (`probe74c.ts` in the s96 scratchpad `47ba0b96-…`
   reproduces it). §72's treatment one sink over: where the key's `tsType` is `string` and the expr is
   an `unknown` read, print `String(x ?? '')`. Check the `object-set` and `store-set` twins (MEASURE,
   do not reason). One session.
2. **§69.4 #1 — the cascade sentence lands on the node IN FRONT of the refused sink** (seen §69.0,
   §70.0, §73's F4). Registration pass; every `dropped:` note pin moves, so the whole-package run is
   the sweep.
3. **§71.5 — the editor cannot author a `Model2` `prop-*` value.** A product-surface ruling for
   Richard. And EXP-008's per-parameter coverage question — §14.5 is the fourth parameter gap that
   sat green behind a `translated` row.
4. **§14.6 (runtime, owner NONE)** — the viewer's `Image.srcSet` is verbatim (`image.ts`, `propPath:
   'dom'`, no setter) while `src` goes through `getAbsoluteUrl`; under `navigationPathType: "path"` a
   two-segment route 404s exactly as the export did. Not this phase's file to fix.

## What this session learned, and would want said again

🔴 **A register names the channel it was found on; count the reach on the PRODUCT before choosing
the shape.** "Apply `cssUrl`'s rule to the `attr:src` channel" was right and would have fixed 2 of
the template's 20 pictures — the other 18 arrive on a wire from `Static Data`, and a wire needs a
run-time helper the app ships, not an emit-time string.
🔴 **`vite preview`'s SPA fallback answers 200 `text/html` for a picture that is not there.**
`PerformanceResourceTiming.responseStatus` graded the reverted arm GREEN on every broken image. The
reading is the decode (`naturalWidth`), and `curl -I`'s content type is the server-side control.
🔴 **A `srcset` picture picks the candidate the VIEWPORT wants**, in both arms alike — a "local
picture" filter written on the `src` attribute counted it broken after the fix. Filter on `currentSrc`.
🔴 **A count gate's `not.toContain('src')` over the notes matched the router shell's `src/App.tsx`.**
Pin the whole list, not a substring.
⚠️ The HLS-001 corpus golden is a design conversation, and its count row carries the counted diff of
every regeneration — this one was NOT additive and says so.
⚠️ Imports are joined AFTER the JSX renders (`component.ts` ~6230 vs `jsxLines` ~6150), so a helper
first named while printing an attribute still earns its import line — set it between the two.
⚠️ A Cloud File's `url` is https and passes through `mediaSrc` untouched; an unset one now clears the
attribute rather than printing `src=""` — the viewer's behaviour, and why the two file pins moved.
