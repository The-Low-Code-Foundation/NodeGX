# Next session — P109 session 23

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 22 (2026-10-06, on `cline-dev`, `7abed2878` … the handoff commit):** **ISL-026 closed (20 of 20) and ISL-027
closed (6 of 6).** Every ruling shipped as its own commit, each with a control (HEAD's file red on exactly the rows it
should be). The board is **17 of 37 closed**, re-derived from the task files' status lines.

## What s22 found that s21's handoff did not know

- 🔴 **A library port's TYPE is not on the instance's input.** `nodedefinition.ts` keeps only colour, text style, array,
  object and string on `_inputs[name]`; a units type stays in the metadata. C6's first build keyed on `input.type.units`
  and switched the unit merge off on EVERY size port. The 95-spec conformance run did not see it; GAM-015 (viewer) did.
  Fixed with a `hasUnits` mark (memory: `a-library-ports-type-is-not-on-the-instance-input`).
- **"Decide `C6_ANY_PORT` by measurement" came out: dropped.** All 95 specs in 17 `NSP_ONLY` groups without it: 0
  divergences. C6 was also written into `nodegx-core/CONTRACT.md` C10 and its graph scenario; both narrowed.
- **s21 left two suites red that it did not run:** runtime `graph.test.ts` (C44's graph row still marked; `84dab5b7a`)
  and spec `world.test.ts` (C8's declared equivalent never passed there; `3d0a57283`). **Run both** after any fix that
  touches a scenario, a world rule or an equivalent: they are outside the conformance file and the batches.
- **Making a signal fire makes its ORDER gradable for the first time.** C11/C37/C48: the specs queued every
  `<field> Changed` ahead of every Changed and Fetched; the runtime interleaves them per key. A known row's predicate
  had absorbed it. Expect the same when ISL-028's C26 (the same dropped `registerOutputIfNeeded`) starts firing.
- **Removing a defect can remove the only thing that killed a mutant.** C49's list churn was what exposed two User
  branches; without it both mutants survived until two scenarios were written for them.
- **Four specs carry their own copy of `_fromJSON`** (User, Record, Create Record, Query Records) beside the spec world's
  `writeStoreEvent`. A rule about writing records goes in all five; they share `sameList` now.
- **The stranger lab needs `nodegx-backend-contract/src` copied beside the package** (`query-records.ts` imports its types).
- **Another session is building stranger round 4** (`stranger-4/`, `tests/stranger-page.js`, edits to
  `stranger.test.ts` and `stranger-suite-hashes.helper.js`, uncommitted). The working tree's stranger suite is red on THEIR
  work. To grade a guarded-file change, check hashes with HEAD's helper and run HEAD's test in a lab copy (as C49 did).

## The board (re-derive it from each task file's status line; never copy this table)

| state | tasks |
|---|---|
| ✅ closed (17) | ISL-001, 002, 003, 004, 005, 006, 011, 014, 015, 016, 017, 019, 020, 021, 023, 026, 027 |
| 🟡 ruled, one reading owed | ISL-012 (AC3's full server render with hydration) · ISL-018 (AC5: the agent round) |
| 🟢 ruled, not built | ISL-013 ("A kit says what it needs") · ISL-024 ("Own package + a note", quiet gap only) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 → P18) · ISL-010 (AC4, Richard) · ISL-009 (export → P18) · ISL-007 (AC4 → P108) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, ruled, buildable | ISL-028 (10) · 029 (12) · 030 (18) · 032 (17) · 033 (5); ISL-031 (15) waits on P107 NSP-023 one control at a time |
| ⬜ Track F, no rulings | ISL-034 … ISL-037 |

## Do, in this order

1. **ISL-028** (navigation and popups, 10 rows, all ruled). Same method as ISL-026/027: AC1 = the known rows still fire
   (grouped `NSP_ONLY`), then one commit per ruling, each with a control. C26 is C11's shape (register on demand).
2. **ISL-029 … ISL-033** in task-file order (ISL-031 one control at a time, after P107 NSP-023 is done with it).
3. **`P109-S22-COLLECTIONCHURN`** (low, open, ruled by C49's "any other list"): a list of objects is a new Collection on
   every read. Recommendation in the ledger file: reuse the record's Collection and `set` its items in place.
4. ISL-013 build; ISL-018 AC5; ISL-012 AC3.

## Decisions for Richard (not yours)

- **New: `P109-S22-BUILTINBOUNDARY`** — kit nodes now have an error boundary; should built-in nodes get one too, so one
  node failing never blanks the page? Recommendation: yes (ledger file, ISL-026 §10).
- `P109-S20-LISTDEFAULTTYPE`: a listed Function output left on "String" — show "Any", or retype the port?
- `P109-S18-REFRESHROWSTATE`: For Each Refresh rebuilds rows (Component Object empties) — keep, or reuse rows by id?
- ISL-010 AC4 (llama.cpp, or accept Ollama alone) and the Effort port's "None (no thinking)".
- Pushing `cline-dev`; publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18 (export), not checked by s22:** does the exported app (a) narrow the unit merge to size ports (C6), (b) read
  Animate To Value's Delay as a number (C20), (c) fire Object / Record / User `<field> Changed` (C11/C37/C48), (d) store a
  Variable's first 0 (C5), (e) skip a re-read list with the same contents (C49)? Plus s21's list: `EXPORTDATEUNITWIRED`,
  `EXPORTBLENDNAN`, ISL-008 AC7, EXPORTKITDEPS, ISL-009's export half, C10's export side.
- **P107:** `P109-S21-DROPDOWNEMPTYRESET`; the day-seed survivors at 20732 (Slider `world.place`, Text Input
  `person.release`), interpreter-side, still red, re-measured s22 with the same result.
- **Release notes, add (s22):** a number on a port that is not a size arrives as sent (C6); Animate To Value's Delay is
  read as a number and a missing one is no delay (C20); a kit node that fails while drawing shows nothing and raises
  `kit-node/render-failed`, and the page keeps drawing; `<field> Changed` on Object, Record and User fire (C11/C37/C48); a
  Variable stores a first 0 and a Set before any Value reports Unchanged (C5); a re-read list with the same contents is
  no change (C49). Plus s21's ISL-026 list.
- The rest of s20's list stands: `P109-S20-LONGTOAST`, P78 TPL-011, P108 IW-010, templates.

## Gate readings taken s22 (2026-10-06)

- **C6:** all 95 specs at seed 20732 in 17 `NSP_ONLY` groups, no `C6_ANY_PORT`: 0 generated divergences; the only red
  specs are the two P107 survivors above. Control (HEAD's `node.ts`): exactly the six C6 scenarios.
- **Per fix** (C20, C11/37/48, C5, C49): its specs at seeds 20732 and 13 conform with 0 divergences; its control red.
- **Runtime jest without the conformance file:** 3161 passed (last after C49). Runtime graph 87 / 87. Spec package:
  graph 119, world 48 / 48, batches + catalog parity green (545 / 545 after C49). Viewer: kit, units and user tests green.
  Stranger rounds (HEAD's harness, lab copy) 41 passed / 17 skipped. Runtime, viewer and spec tsc 0.
- `node scripts/bugs.js check`: 5 problems, none in P109's files (s21: 6).

## Recipes s22 used (scratchpad gone; these are enough)

- **A replay of a generated divergence, both traces side by side:** `NSP_DEEP=200 NSP_ONLY=<type> NSP_REPLAY_DIR=<dir>
  npx jest test/node-spec/conformance.test.ts -t deep` writes shrunk replays; a throwaway test in `noodl-runtime/test`
  then `play`s one on `interpreterAdapter` and on `withViewerNodes(runtimeTarget())` and prints both. Delete it after.
- **A spec's reference trace for one scenario:** `ts-node --transpile-only` with
  `TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}'` (from a scratch dir), `play` from
  `src/adapter` on `interpreterAdapter`. Check every renamed scenario's name against it.
- **A CAS commit:** `read-tree HEAD` into a temp index, `git add` the paths, check the staged count, `commit-tree`,
  `update-ref HEAD NEW BASE`, then `git reset -q -- <paths>`.
- **A control:** `cp` the fixed file aside, `git show HEAD:<path> > <path>`, run, `cp` back, `cmp`. Never during a peer's run.
