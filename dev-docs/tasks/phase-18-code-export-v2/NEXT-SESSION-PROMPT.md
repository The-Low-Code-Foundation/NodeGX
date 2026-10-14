# Next session — session 101 (2026-09-26/27) BUILT §76: `Pattern Extractor` — picker **122 → 123 of 130 (94.6%)**, the second row of Richard's 2026-09-26 ruling ("If we had 100% coverage that would be a big deal"). `Hash`'s crypto-call shape (§59) widened to seven seeded value outputs and a third signal pair (`Found`/`Not Found`, printed before `Done`, as `doExtract` fires them).

## ✅ Session 102 (2026-10-14, BOARD lane 6): the owed gates are read and session 101's pile is COMMITTED

Everything below this section that says "uncommitted" or "owed gates" is history now: both gates ran. The
whole-package jest had 6 suites red. Two were the pile's (the 16th floor pin, and the HLS-001 golden that did not
know `pattern-desk`), and both are fixed in the same commit. Four are red at HEAD without the pile, each from
another phase. `test:ci` passed 3017 / 0. The record is in EXP-011 §76.5.

**Next, in order (BOARD lane 6):**
1. `P18-S102-GRAPHNOSPEC`: NSP-008 on the export throws on a node it has no spec for. This is ISL-043's instrument.
2. `P18-S102-NAVENCODE`: the exported Navigate To Path sends Query values unencoded. The runtime has encoded them
   since D21.
3. `P18-S102-DATEHARNESS`: date-family's runtime harness stubs `require`, so the export has gone ungraded since ISL-032.
4. `P18-S102-CATALOGNAME`, `P18-S102-NOEXPORTCI`: small.
5. Then ISL-043, and §77–§79 below.

`node scripts/bugs.js --from P18` lists them. The whole-package suite should read `Test Suites: 4 failed` (those
four, by name) until they are fixed. Any fifth red is new.

---

**(Session 101's hand-off, kept as written.)** Session 101's work was uncommitted at hand-off. Session 102 committed it.

## 🔴 Read this first — Richard, 2026-09-02: *"Stop fucking up the CPU."*

One heavy job at a time on this 16 GB box. Session 101 ran individual specs only (`the-pattern-extractor.test.ts`
39/39, the nine re-pointed no-rule specs 353/353, `browser-utilities.test.ts` 55/55 after the crypto verbs'
signatures changed, package `tsc --noEmit` 0, `export-ledger:check`/`--picker` both green) and the editor's
`tsc -p tsconfig.json --noEmit` (exit 0, empty log — the gate the §75 handoff owed). **It did NOT run the
whole-package `nodegx-export` jest (101+ files) or the editor's `test:ci`** — a peer session held the box for
the whole drive and no slot opened before this session closed. Session closed on the user's own instruction
("Close out here, just update docs") rather than push through a busy box.

## 🔴 The next session's FIRST job: the two owed gates, before building anything else

1. `cd packages/nodegx-export && npx jest` — whole package, once. Expect green: nothing under `src/` was
   touched after the individual specs above went green, and the fifteen `pickerCoverageFloor` pin comments
   were moved by the same session that moved the ledger's own number (never by hand). If it is NOT clean,
   that is this session's own miss — read the failing file's own reasoning before assuming a peer's collision.
2. `cd packages/noodl-editor && npx webpack-cli --config=webpackconfigs/webpack.test-ci.js && node scripts/run-electron-tests.js --ci` (`npm run test:ci`) — the editor's own gate, which typechecks this package's tests
   under a different tsconfig dialect (`the-editor-test-ci-webpack-typechecks-a-sibling-packages-tests`).
   The plain editor `tsc --noEmit` already ran clean this session; `test:ci` is the one that has not.

Only after both read clean should the next session move to building a further row — building on top of an
unread gate is exactly the trap `a-read-before-pointer-is-a-precondition-not-a-label` and
`a-run-list-is-not-a-log` name.

## The board, re-derived from the task files

| task | status |
|---|---|
| EXP-001 `@nodegx/core` | ✅ Published `0.1.0` (4 `0.1.1` rows carried) |
| EXP-002 / 003 / 005 / 006 / 007 | unchanged |
| EXP-004 | 🟡 built + driven; drill-down panel + the comprehension test remain (Richard's); §69.4 #1 |
| EXP-008 | ✅ `export-ledger:check` OK — **180 types, 130 translated, 32 deferred, 1 stubbed, 17 backend-only**. 🔴 Open: no per-parameter coverage (§75.5 #3 / §76.4 #4 restate it — do not quote 100% without it) |
| EXP-009 / EXP-010 / EXP-012 / EXP-013 | 🟢 |
| EXP-011 picker coverage | 🟡 **123/130 (94.6%)** — §76 built `Pattern Extractor`. **7 left**: Action Dispatcher, Action Handler, State Snapshot, State History, Undo / Redo, Optimistic Update, Sign In With |
| EXP-014 / 015 / 016 / 017 | 🟢 |

## What session 101 did (EXP-011 §76 — read it; this is the summary)

1. **Measured `Pattern Extractor` against `Hash`'s shape (§59) before writing anything.** Both are
   `crypto-call`: an action port, an outcome pair, a raise on Failure. The extractor differs in degree, not kind:
   SEVEN value outputs where Hash has one (each SEEDED by `initialize`, unlike Hash's row, which boots
   undefined), and a third signal pair — `Found`/`Not Found` — sent *before* `reportOutcome('done')`, so two
   more chain arms compile off one Extract. `CryptoNodeKind` widened to `'hash' | 'random-bytes' | 'pattern'`;
   `CryptoCallAction` gained `foundThen`/`notFoundThen` and `materializeByPort`.
2. **`src/emit/patternLib.ts` → emitted `src/lib/pattern.ts`**: one verb, `tryExtract`, transcribed from
   `stream-parsers.ts`'s `extractPattern` plus the node's own setters/getters. Generated from a real `.ts` file,
   typechecked strict with no ambient types, graded by a 5,280-cell differential against the runtime before
   being turned into the string-array form.
3. 🔴 **Found writing the differential, not by reading: every crypto-family call needed optional arguments.**
   The emitter already drops trailing `undefined`s (`tryHash()` for an unconfigured Hash), but `tryHash`/
   `tryRandomBytes`'s own signatures still *required* every parameter — so that printed call was one the
   exported app's own strict `tsc` refused. No existing gate caught it (`browser-utilities.test.ts` E2 asserts
   the printed text, never typechecks it). Fixed in the same session: both verbs' signatures now take optional
   arguments, with the reason at the call site.
4. **The fold whitelist's hazard, in the opposite direction from every prior instance.** §37/§59/§75 each found
   a row that NEEDED the `?? ''` fold and silently didn't get one. The extractor's rows are all seeded — never
   undefined — and the first emit printed `{percentError ?? ''}` anyway: a fold that was never needed, applied
   because `outcome-error`'s existing rule read `viaState !== undefined` with no way to say "and this one is
   seeded". Fixed with a `seeded` marker on the expression, read in both `plan.ts` and `component.ts`.
5. **Nine tests across the package had borrowed `net.noodl.Hash` or `net.noodl.PatternExtractor` as their
   "node with no rule" example** (§59 and prior sessions re-pointed some of these already, moving the target as
   each phase translated the previous one). Re-pointed to `net.noodl.user.SignInWith` — the next untranslated
   row down the §75.5/§76.4 order — and re-run 353/353.
6. **`tests/the-pattern-extractor.test.ts` 39 rows**: §A the fixture whole (17 files, pattern lib shipped,
   crypto lib absent, app typechecks, every row prints bare), §B the differential (11×12×8×5 grid, 5,280
   cells), §C nine wire-shape variations, §D nine refusals by exact sentence, §E the two findings pinned, §F
   the ledger and earned-not-shipped controls. Ledger: one row → translated, fifteen pins moved, floor 122 →
   123.

## Uncommitted at hand-off

**Everything from session 101 is uncommitted.** `git status --short` in the repo root shows, under
`packages/nodegx-export/`:
- Modified: `coverage-ledger.json`, `src/analyze/plan.ts`, `src/emit/component.ts`, `src/emit/cryptoLib.ts`,
  `src/emit/emitApp.ts`, and fifteen `tests/*.test.ts` files (the floor-pin moves and the nine re-pointed specs).
- New: `src/emit/patternLib.ts`, `tests/the-pattern-extractor.test.ts`, `tests/fixtures/pattern-desk/` (the
  fixture directory, incl. a `Components/MatchRow` template).

Also under `dev-docs/tasks/phase-18-code-export-v2/`: this file, `README.md` (headline number + the §3
strike-through), and `EXP-011-PICKER-COVERAGE.md` (§76 appended, §3's list amended).

PEERS' work, untouched and heavy, is also sitting uncommitted in the same working tree (unrelated to this
phase): `dev-docs/tasks/phase-78-the-templates/**`, `packages/nodegx-backend/tests/**`,
`packages/noodl-mcp/tests/**`, `package.json`/`package-lock.json`, and others outside `nodegx-export` and this
phase's docs. 🔴 **Commit through a temporary index with pathspecs that name only this session's files**;
never `git add -A` or a plain `git commit` on this tree (`commit-your-delta-through-a-temporary-index`,
`a-pathspec-commit-skips-untracked-files` — the new files above need explicit paths, not just the modified
ones).

## 🔴 Do this next (BUILD) — after the two owed gates in §76.3/above

1. **§77 `Action Dispatcher` / `Action Handler`** (`agent/action-dispatcher.ts` 963 + `actiondispatchernode.ts`
   673 lines) — an in-app bus; read `Send Event`/`Receive Event`'s translation first, it is the nearest shape.
2. **§78 the history family** — `State Snapshot`, `State History`, `Undo / Redo`, `Optimistic Update`
   (`statesnapshotnode.ts`, `statehistory.ts`, `undonode.ts`, `outcome.ts`). Two sessions; stateful.
3. **§79 `Sign In With`** — the §48 reason ("waits on a provider decision") is STALE: `nodegx-backend/src/
   auth/github.ts` exists and `RestAuthAdapter.signInWithProvider` is implemented. Needs a drive of the
   redirect's return leg (`_consumeAuthReturn`) against the real backend, not a spec alone.
4. **Before anyone quotes 100%:** EXP-008's per-parameter coverage question (§75.5 #3 / §76.4 #4) — one
   session on a per-parameter ledger check.
5. Still queued from earlier sessions: §74.5 #1 (the `unknown`-into-a-typed-store-key sink), §69.4 #1 (the
   cascade sentence), §71.5 (Richard's ruling).
6. **No drive was run this session** (§76.4 #6) — the built `pattern-desk` export has not been served/driven
   headless. Not blocking (the differential + emitted-app typecheck graded it), but owed before the row is
   called fully proved the way §59's utility-desk was.

## Earlier hand-off (session 100), kept for the record

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

