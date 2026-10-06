# Next session — P109 session 24

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 23 (2026-10-06, on `cline-dev`, `3ae687fbe` … the handoff commit):** **ISL-028 closed (10 of 10)** and **ISL-029
at 11 of 12** (D24 left, by its own ruling's precondition). Every ruling shipped as its own commit (or one per shared
mechanism), each with a control: HEAD's file red on exactly the rows it should be. The board is **18 of 37 closed**,
re-derived from the task files' status lines.

## What s23 found that s22's handoff did not know

- **ISL-028's §5 assumed every row was a known row. Only C25 was.** C26, C27 and C29 were graded NOWHERE (the specs'
  docblocks said so: the world records `params` canonically and has no back channel). They got viewer tests on the real
  stack / Router methods, written red first. Read a spec's "NOT GRADED HERE" block before trusting a task's §5.
- **A scenario's NAME can go false while its trace still passes.** Five did across the two tasks (C42's "a save is still
  not heard", C34's "nothing to put back", C35's access-rules row, …). After a spec version, grep the scenario names for
  the old behaviour, not only the failing ones.
- **Old tests pinned the defects** (`query-records-empty-sort`, `cloudstore-files`'s `undefined/files/…`) and stubs lacked
  what a fix now reads (`nda-004`'s CloudStore without `forBackend`, a record stub without `get`). Run the package's
  whole suite after a fix that changes what a node reads, not just the spec run.
- **A swap-branch mutant hands the branch its twin's RECORDED example patch** (`src/runner/mutants.ts`). C42's v3 first
  left one alive; it died only to a scenario where exactly ONE arm reacts (two saves on two backends made both arms re-run
  once and read the same global registry). A throwaway probe printing the branches' examples found it in one run.
- **`conformance.test.ts` has another session's open edit** (P107 s50's C79 predicate). Both known-row removals (C43, C36)
  were committed as `git show HEAD:<path>` minus my lines, through a temp index — never the working copy.
- **The spec package's whole jest suite is too heavy for a shared box** (7 workers, >10 min — stopped). The subset is
  enough: `tests/batch-<family>.test.ts tests/catalog-parity.test.ts tests/graph.test.ts tests/world.test.ts tests/schema.test.ts`.
- 🔴 **A python edit whose end index fell back to end-of-file replaced the rest of `delete-record.ts`** (caught by the
  line count, restored from HEAD; nothing lost). Assert both ends of a slice exist before replacing it.

## The board (re-derive it from each task file's status line; never copy this table)

| state | tasks |
|---|---|
| ✅ closed (18) | ISL-001, 002, 003, 004, 005, 006, 011, 014, 015, 016, 017, 019, 020, 021, 023, 026, 027, 028 |
| 🟡 one row left | ISL-029 (D24: probe a real NodeGX backend first, §9) |
| 🟡 ruled, one reading owed | ISL-012 (AC3's full server render with hydration) · ISL-018 (AC5: the agent round) |
| 🟢 ruled, not built | ISL-013 ("A kit says what it needs") · ISL-024 ("Own package + a note", quiet gap only) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 → P18) · ISL-010 (AC4, Richard) · ISL-009 (export → P18) · ISL-007 (AC4 → P108) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, ruled, buildable | ISL-030 (18) · 032 (17) · 033 (5); ISL-031 (15) waits on P107 NSP-023 one control at a time |
| ⬜ Track F, no rulings | ISL-034 … ISL-037 |

## Do, in this order

1. **ISL-029 D24.** First the probe its ruling asks for: a `nodegx` backend under `backendServices` with no
   `cloudservices` endpoint (Parse wire, `data.acl` supported) — Log In, then Create Record with an Owner rule; read the
   call's `acl`. If it is missing there, Owner rules are silently dropped today (a security row: say so first). Then build
   the ruling: the access rules read the signed-in user from the record's OWN backend (`CloudStore.forBackend(scope,
   backendId)`'s session), not `CloudStore.instance`. On Directus / PocketBase the "ACL ignored" warning then appears again.
2. **ISL-030 … ISL-033** in task-file order (ISL-031 one control at a time, after P107 NSP-023 is done with it). Same
   method: read each spec's "not graded" block; red first; one commit per ruling with a control.
3. **`P109-S22-COLLECTIONCHURN`** (low, open): a list of objects is a new Collection on every read. Recommendation in its
   ledger file.
4. ISL-013 build; ISL-018 AC5; ISL-012 AC3.

## Decisions for Richard (not yours)

- `P109-S22-BUILTINBOUNDARY` — should built-in nodes get the kit nodes' error boundary, so one node failing never blanks
  the page? Recommendation: yes (ledger file, ISL-026 §10).
- `P109-S20-LISTDEFAULTTYPE`: a listed Function output left on "String" — show "Any", or retype the port?
- `P109-S18-REFRESHROWSTATE`: For Each Refresh rebuilds rows (Component Object empties) — keep, or reuse rows by id?
- ISL-010 AC4 (llama.cpp, or accept Ollama alone) and the Effort port's "None (no thinking)".
- Pushing `cline-dev`; publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18 (export), not checked by s23:** does the exported app have any of ISL-028's ten (a copy of Navigate / Push
  params; Push's back outputs; a refused push answered; path values as written and an encoded query; an unknown Mode
  failing; a failed popup's slot given back; no Done for a popup replaced before it opened; a nested Close Popup reaching
  the outer one) or ISL-029's eleven (task §9 of each)? Plus s22's list (C6, C20, C11/C37/C48, C5, C49), s21's
  (`EXPORTDATEUNITWIRED`, `EXPORTBLENDNAN`, ISL-008 AC7, EXPORTKITDEPS, ISL-009's export half, C10's export side).
- **P107:** `P109-S21-DROPDOWNEMPTYRESET`; the day-seed survivors at 20732 (Slider `world.place`, Text Input
  `person.release`), interpreter-side — not re-measured s23.
- **Release notes, add (s23):** Navigate and Push to the same page with new parameters get there; Push's Back Results and
  Back Actions connect; Navigate To Path answers a refused push, inserts values as written, encodes its query and leaves
  out a null (and so does `Noodl.Navigation.navigateToPath`); Push fails an unknown Mode; a popup that failed to open
  leaves no trace; Show Popup's Done means the popup opened; a nested Close Popup can close the outer popup by name.
  Query Records: no saved script runs the starter script, a script typo or crash fails the node; a live list over its
  Limit drops the last (unsorted: queries again) and a saved record moves to its new place. Filter Records hears saves on
  the project's backend and fails a sort it cannot apply. Record: a null Id is Missing Id.; Update Record puts the old
  values back when a save fails; Delete Record reports Done for the record it deleted; a project with no backend says so;
  a Role rule with no role refuses the write. Plus s22's list.
- The rest of s20's list stands: `P109-S20-LONGTOAST`, P78 TPL-011, P108 IW-010, templates.

## Gate readings taken s23 (2026-10-06, at `8ec177377` unless said)

- **Per fix:** its specs at seeds 20732 and 13 conform with 0 divergences, every mutant killed but the declared
  equivalents; its control (HEAD's runtime file) red on exactly its rows. Numbers in each commit and each task's §9.
- **Runtime jest without the conformance file:** 3167 passed, 0 failed (after C33, `5286345e8`; one earlier run read
  1 failed, unnamed, and two reruns 0 — recorded as a flake). **Viewer:** 1772 / 1772 (143 suites). Runtime graph 87 / 87.
  Spec subset (records + navigation batches, catalog parity, graph, world, schema) 556 / 556. Runtime, spec, viewer tsc 0.
- `node scripts/bugs.js check`: 5 problems, none in P109's rows (s22: 5).
- **Not run s23:** all 95 specs in groups; the editor; the stranger rounds (no guarded file touched: checked against
  HEAD's hash list each time).

## Recipes (scratchpad gone; these are enough)

- **A CAS commit:** `GIT_INDEX_FILE=<tmp>`, `git read-tree HEAD`, `git add` the paths, check the staged count,
  `commit-tree`, `update-ref HEAD NEW BASE`, then `git reset -q -- <paths>`. **For a file with a peer's open edit:**
  build the blob from `git show HEAD:<path>` plus your edit, `git hash-object -w`, `git update-index --cacheinfo`.
- **A control:** `cp` the fixed file aside, `git show HEAD:<path> > <path>`, run, `cp` back, `cmp`. Never during a peer's run.
- **A graph scenario's trace after a fix:** drop its `row`, then `NSP_RECORD=1 npx jest test/node-spec/graph.test.ts -t
  "<name>"` in `noodl-runtime`; read the diff (it should be the fix's events only), then replay the suite twice.
- **A surviving mutant:** a throwaway `tests/zz-*.test.ts` in the spec package that imports
  `../src/runner/scenario-files`, runs `discoverBranches` over the scenarios and prints each branch's `example`. Delete it.
- **zsh:** a file list in a variable is ONE argument — pass `$(grep -rl … )` inline.
