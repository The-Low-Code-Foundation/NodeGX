# Next session — P109 session 26

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 25 (2026-10-06, on `cline-dev`, `86139ddbf` … the handoff commit):** **ISL-032 closed (17 of 17)** — 15 fixed in
11 commits, each with a control (HEAD's runtime file red on exactly the rows it should be), D4 and D5 closed as ruled (no
change). The board is **21 of 37 closed**, re-derived from the task files' status lines. Record: ISL-032 §9.

## What s25 found that s24's handoff did not know

- 🔴 **A peer's pathspec commit swept my open hunk.** `63b7c4e91` (P107 Text v5) committed `conformance.test.ts` whole,
  with my uncommitted C9 `KNOWN_ROWS` removal in it. Commit a hunk in a file a peer is editing AT ONCE, through a temp
  index (HEAD + your hunk), or keep it out of the working file until you commit.
- 🔴 **A peer's open edit can make the primary's runtime target unloadable.** A P107 Group spec in progress made
  `node-spec-target.ts` load a viewer scroll plugin jest cannot parse (80 / 91 graph scenarios red on load). Grade in a
  worktree at HEAD: `scripts/devtools/make-worktree.sh <name> HEAD <abs-parent>` (s25's is
  `OpenNoodl-worktrees/isl032-s25` — remove it with `git worktree remove` when done), copy your files in, copy results back.
- 🔴 **A spec fix on a node the strangers were handed moves their fixtures.** Rounds 1–2 (`stranger/`, `stranger-2/`) built
  Counter, Switch, And, Condition, String Format (+ Inverter, Boolean To String) from v1. A behaviour change there turns the
  rounds red: change the fixture's line, mark it "not the stranger's line", refresh the hashes. A comment-only edit to a
  guarded spec moves its hash too.
- **C9 was the only known row of the 17;** C12–C14 were graph `row` marks, C15 only in a recorded trace. Expect ISL-031's
  NSP-016 rows to be `KNOWN_ROWS` entries (Text Input, Checkbox, Dropdown, Slider, Radio) — that file is P107's, edited
  live by a peer: CAS-commit your hunk the moment it is measured.
- **A fix can turn a mutant equivalent** (D10: Stop's `unchanged` branch). Declare it in `equivalent-mutants.ts` with why.
- **`runtime graph.test.ts`'s first scenario times out at 5 s in a cold parallel run** — 0.4 s alone. A load flake.
- **Two description copies hide outside the catalogs:** `docs/node-catalog/enrichment/*.json` and the editor's
  `cloud-node-library.json` (`npm run cloud-library:check`). The cloud library was stale at HEAD (s24) — fixed `25328357c`.

## The board (re-derive it from each task file's status line; never copy this table)

| state | tasks |
|---|---|
| ✅ closed (21) | ISL-001, 002, 003, 004, 005, 006, 011, 014, 015, 016, 017, 019, 020, 021, 023, 026, 027, 028, 029, 030, 032 |
| 🟡 ruled, one reading owed | ISL-012 (AC3's full server render with hydration) · ISL-018 (AC5: the agent round) |
| 🟢 ruled, not built | ISL-013 ("A kit says what it needs") · ISL-024 ("Own package + a note", quiet gap only) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 → P18) · ISL-010 (AC4, Richard) · ISL-009 (export → P18) · ISL-007 (AC4 → P108) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, ruled, buildable | ISL-033 (5, descriptions) · ISL-031 (15, controls — P107's NSP-016 files are live) |
| ⬜ Track F, no rulings | ISL-034 … ISL-037 |

## Do, in this order

1. **ISL-033** (5 description rows — the five copies of a sentence: viewer/runtime node, spec, docs page, both catalogs,
   plus enrichment and the cloud library where they carry it). Check whether ISL-032's C12 sentence change already covers
   one of its rows.
2. **ISL-031** (15). Read each spec's "ROWS" / "NOT GRADED" block first; most rows sit in P107's `KNOWN_ROWS` and the
   control specs P107 is still editing — check `git status` + mtimes on those files before every edit.
3. **`P109-S22-COLLECTIONCHURN`** (low, open). Then ISL-013 build; ISL-018 AC5; ISL-012 AC3.

## Decisions for Richard (not yours)

- `P109-S24-SIGNINWITHERRORKEPT` (new) — Sign In With clears Error the way D25 used to (to nothing); probably unreachable
  (one return per page load). Change it to blank text, or close it?
- `P109-S22-BUILTINBOUNDARY` — built-in nodes get the kit nodes' error boundary? Recommendation: yes.
- `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing `cline-dev`,
  publishing the Garden kits at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18 (export), s25:** `P109-S25-EXPORTSTATESRUN` (C22's shape in `statesLib.ts`) and `P109-S25-EXPORTFEEDZONE`
  (D16's reader in `parseLib.ts`), both read, not run. Not checked for the export: D17, D18, D10, D14, C14, C15, C9.
- **Release notes, add (s25):** Receive Event's Consume now stops a Children or Siblings event at the component that
  consumed it, and its description says it never stops a Global event. Condition's Is True / Is False report the last
  test. Create New Array / Object and Set Object Properties answer every Do press. States: a move during an animation
  lands where it says; a state that leaves a text empty clears it. String Format prints `$` exactly. Substring's End
  "-1" as text runs to the end. Parse Feed: a date with no zone is UTC everywhere; CEST / BST dates are dropped rather
  than shown wrong; Feed Updated clears; Count matches Items. Action Dispatcher: a Dispatch refused on the spot fires
  Failure; Waiting For clears when a wait ends. Delay's Stop says Done for a countdown started the same frame. Date To
  String: a timestamp renders and an empty Date is Invalid Date, with or without a Timezone.

- **P18 (export):** `P109-S24-EXPORTBADBODY` filed (D11's twin: the exported HTTP Request reports an unreadable JSON body
  as `http/network-error`). Not checked for the export: D24 (does an exported access rule read the record's own
  backend?), the rest of ISL-030 (C7 is fine there — it reads `auth-authToken`; D12 n/a — Cancel defers; C47 probably
  clears through React state). Plus s23's and earlier lists.
- **P107:** `node-spec-target.ts` (P107's open edit) — its `installUser` docblock still says the access rules read the
  legacy store; the code needs no change. Correct the sentence when the file is free.
- **Release notes, add (s24):** an Owner access rule works on a NodeGX backend configured under Backend Services (it was
  dropped); on Directus / PocketBase the "ACL ignored" warning appears again. HTTP Request: Authentication sends the
  credential; an unreadable JSON body fails as `http/bad-body`; Cancel stops every request. Sign-in: a backend blip at
  page load keeps the person signed in and says nothing; an expired session says Session Lost once; after sign-out the
  User node's Id / Email / Username go blank and Roles / properties empty; a cancelled provider sign-in fails once.
  Files: Error Status Code is the real HTTP status (an app that checked 119 checks 403); Error is always a sentence;
  Cloud File's Name is the uploaded name; Sign File URL clears Expires At / TTL for a public link; Open File Picker's
  cleared Capture no longer opens the camera. Set User Properties refuses a Username on Directus / PocketBase. Streams:
  Subscribe To Changes and Query Records' realtime ignore repeated values; SSE's status outputs stay current and it says
  idle after a URL change with Auto Connect off. Cloud Function's Error is always text. Request Magic Link clears Error.

## Gate readings taken s25 (2026-10-06)

- **Per fix:** its specs at seeds 20732 and 13 CONFORM, every mutant killed but the declared equivalents; its control red
  on exactly its rows (ISL-032 §9 has each).
- Runtime jest without the conformance file 3179 passed (one cold-start timeout, 91 / 91 alone) — before C14/C15, D10,
  D14; viewer 1775 / 1775 (same point); runtime graph 91 / 91; spec graph 123 / 123; spec catalog parity, schema, world,
  batch, batch-data, batch-time, pilot, stranger green; runtime, spec, viewer tsc 0; catalog:check, catalog:merge:check,
  cloud-library:check up to date; `bugs.js check` 5 problems, none P109 ISL-032's.
- C14/C15, D10, D14 measured in the worktree at HEAD (graph 91 / 91, the dispatcher's unit + corpus 192, Date To String
  108, viewer timer 48, three tsc 0).
- **Not run:** the full runtime and viewer suites after the last three commits (the primary target was unloadable under
  the peer's Group edit); the editor; the stranger 10,000 runs.

## Recipes

- **A CAS commit:** `GIT_INDEX_FILE=<tmp>`, `git read-tree HEAD`, `git add` the paths (or `update-index --cacheinfo` a
  blob built from `git show HEAD:<path>` + your edit, for a file with a peer's open edit), check the staged count,
  `commit-tree`, `update-ref HEAD NEW BASE`, then **`git reset -q -- <paths>`**.
- **A control:** back up by FULL path, `git show HEAD:<path> > <path>`, run with `--forceExit` to a file, then restore
  in a SEPARATE command and `cmp`. Never while a peer's run that loads that package is starting; a peer's
  interpreter-only step (`nodegx-node-spec/tests/…`) does not load the runtime.
- **Closing a ledger row:** status fixed, `commit:`, `kit: node-spec`, `regression:`, and a "Fixed <sha>" paragraph —
  s24's helper was a 20-line python script (regex on the header); rebuild it.
- **A per-ruling control inside one file:** build the partial from HEAD with the one fix applied (python string replace
  on `git show HEAD:<path>`), run, restore in a separate command and `cmp`.
- **Grading in a worktree:** `make-worktree.sh` links node_modules correctly; `git -C $W diff --quiet -- <path>` before
  copying in; `cmp` the file back against primary after the run.
