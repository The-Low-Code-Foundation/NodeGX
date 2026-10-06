# Next session — P109 session 22

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 21 (2026-10-06, on `cline-dev`, `fae14dff4` … the handoff commit):** Track F committed on Richard's word, and
**ISL-026 went from 0 to 17 of 20 fixed**. Each ruling shipped as its own commit, each with a control: HEAD's file
against the new scenarios, red on exactly the rows it should be. The board is still 15 of 25 closed; ISL-026 is 🟡.

## What s21 found that s20's handoff did not know

- **The Track F split was wrong.** s20 said "102 ledger files + 32 that belong to other peers". In fact 31 of the 32 were
  Track F's own (`open` → `scheduled`, `phase:` / `task:` lines). Three files (C76, C80, D37) also held a live P107
  session's paragraphs, which were left out by building those blobs from HEAD. `fae14dff4`: 146 files.
- **"C70 needs no spec change" (the P107 peer's word) was wrong for one case.** The ruling "Read old text, else no
  options" means old-format text *shows* its options; the Dropdown spec offered none for text. So it is Dropdown v4.
- **The whole runtime conformance batch no longer fits its 30-minute `beforeAll`** on a loaded box. At seed 20732 the
  Slider alone took 29 minutes. Every test then fails on the hook's timeout, which reads like 110 red specs. Run it with
  `NSP_ONLY` in groups, never whole, and read the per-spec report lines ("X vN on runtime: CONFORMS").
- **A snapshot of a file a live peer is editing goes stale.** My first C3 commit took a peer's matcher hunk from
  `conformance.test.ts`, because the diff was snapshot → working and the peer had edited after the snapshot. Rebuilt
  by CAS on the same parent (`350c3ec31`). From then on every commit built `conformance.test.ts` as **HEAD's copy plus
  my edit script** (`git show HEAD:… | edit.py`), and checked that the result equals the working file.
- **A peer's commit (`a65b077a8`) declared `const isNull` twice**, a half-applied line of my open C4 edit. Its
  conformance file could not load; fixed in `f94bc681d`, and the peer was told.
- **A spec edit that removes a `typeof` guard loses TypeScript's narrowing** (C18, C8). Then the whole conformance
  file fails to compile for every session. Run `npx tsc --noEmit -p packages/nodegx-node-spec` before the suite.

## The board (re-derive it from each task file's status line; never copy this table)

| state | tasks |
|---|---|
| ✅ closed (15) | ISL-001, 002, 003, 004, 005, 006, 011, 014, 015, 016, 017, 019, 020, 021, 023 |
| 🟡 ISL-026 17 / 20 | C6, C20, KITTHROWBLANKS left (task §9, in order) |
| 🟡 ruled, one reading owed | ISL-012 (AC3's full server render with hydration) · ISL-018 (AC5: the agent round) |
| 🟢 ruled, not built | ISL-013 ("A kit says what it needs") · ISL-024 ("Own package + a note", quiet gap only) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 → P18) · ISL-010 (AC4, Richard) · ISL-009 (export → P18) · ISL-007 (AC4 → P108) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, ruled, buildable | ISL-027 … ISL-033 (ISL-031 waits on P107 NSP-023 one control at a time) |
| ⬜ Track F, no rulings | ISL-034 … ISL-037 |

## Do, in this order

1. **ISL-026 C6** (task §9 item 1). The core `node.ts` merge, in two places. It ships alone, with grouped conformance
   runs and the runtime's whole jest suite. `pgrep -f "jest|conformance"` first: P107 peers run 10,000-sequence suites.
2. **ISL-026 C20**, following C19's stranger precedent (`fec895706`; task §9 item 2).
3. **KITTHROWBLANKS** (re-measure, then an error boundary per kit node). With it, ISL-026 closes; AC4 then reads
   `node scripts/bugs.js --from P107` / `--from P109` with none of the task's rows open.
4. **ISL-027** (every Changed signal the editor offers fires). Same method: AC1 = the known rows still fire, then one
   commit per ruling, each with a control.
5. ISL-013 build; ISL-018 AC5; ISL-012 AC3.

## Decisions for Richard (not yours)

- `P109-S20-LISTDEFAULTTYPE`: a listed Function output left on "String" — show "Any", or retype the port?
- `P109-S18-REFRESHROWSTATE`: For Each Refresh rebuilds rows (Component Object empties) — keep, or reuse rows by id?
- ISL-010 AC4 (llama.cpp, or accept Ollama alone) and the Effort port's "None (no thinking)".
- Pushing `cline-dev`; publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18:** `P109-S21-EXPORTDATEUNITWIRED` (a wired date Unit refused for a reason that is gone), `P109-S21-EXPORTBLENDNAN`
  (the exported `blendColor` still renders `#NaNNaNNaN`; NaN left the parity grid in `small-utilities.test.ts`, put it
  back with the fix), plus s20's list (ISL-008 AC7, EXPORTKITDEPS, ISL-009's export half). C10's export side was **not
  checked** (does an exported Array Filter / Map survive a non-list Items?).
- **P107:** `P109-S21-DROPDOWNEMPTYRESET`. After a list offering no options, the browser selects the first enabled option of
  the next list, and the spec does not; measured with a temporary scenario. C70's scenario chooses the second option
  to stay clear of it. Also: the Text Input and the Slider each show one surviving spec mutant at seed 20732
  (`person.release`, `world.place`). These are interpreter-side, so not ISL-026's, but they are a day-seed red on those two specs.
- The rest of s20's list stands: the toast card (`P109-S20-LONGTOAST`), P78 TPL-011, P108 IW-010, templates, release notes.
- **Release notes, add:** the ISL-026 behaviour changes. A wrong-kind value is read as text (String Format, SSE,
  Parse XML), as empty (Substring, String Mapper, Cloud Function's null body, Filter Records' null Items), as the default
  (date units, Placement), or refused with a named Failure (Array Filter / Map / Filter Records `not-a-list`, HTTP
  `input-not-text`, Navigate To Path `no-path`). Color Blend keeps its colour; labels show objects as text; a Dropdown
  reads its old text Items. Two new runtime errors: `color-blend/unreadable-blend-value`, and the date nodes'
  `unknown-unit` warning.

## Gate readings taken s21 (2026-10-06)

- **AC1** at `fae14dff4` (seed 20732, 19 ISL-026 nodes, `NSP_ONLY`): all conform with their known rows; the "known rows
  still fire" test green. C8, C18, C20, D8 had no known row (their specs modelled the runtime), so the re-measure for
  those was the fix's control.
- Per fix, at its commit: the touched specs conform at seed 20732 with 0 generated divergences, and the control is red
  (numbers in each commit message and in ISL-026 §9). A second seed (13) over all 21 touched specs except the Text
  Input and the Slider, at `283b46573`: **all 21 CONFORM**, and the "known rows still fire" test green (22 passed).
- Spec package, by suite, after the last fix: batch 315 / batch-data + catalog-parity 309 / batch-visual + catalog-parity
  + schema + stranger 371 passed. Viewer tests on the touched controls 780 / 780. Export suites that load runtime files
  changed today: 421 / 421 (+ small-utilities 20 / 20 after the grid change). Runtime, viewer and spec tsc: 0.
- `node scripts/bugs.js check`: 6 problems, all in the peer's P78 file (unchanged from s20).

## Tools s21 left in its scratchpad (gone; the recipes are enough)

- **A spec's reference trace for one scenario:** `ts-node --transpile-only` a 10-line script. It imports
  `{ specs, mount, set, settle, act, signal, trace, loadScenarios }` from `packages/nodegx-node-spec/src`, replays a
  scenario's steps and prints `trace(inst)`. Use it to check that a scenario's NAME says what its trace does. Twice in
  s21 the name claimed more than the trace showed.
- **A CAS commit script:** `read-tree HEAD`, an optional conformance edit applied to HEAD's copy, `git add` the paths,
  check the staged count, `commit-tree` / `update-ref HEAD NEW BASE`, then reset the real index for those paths.
