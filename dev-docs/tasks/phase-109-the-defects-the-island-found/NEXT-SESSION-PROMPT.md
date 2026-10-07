# Next session — P109 session 27

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 26 (2026-10-06/07, on `cline-dev`, `1d1496929` … the handoff commit):** **ISL-033 closed (6 of 6)** and **ISL-031
14 of 23**, each fix with a control (HEAD's file red on exactly its rows). The board is **22 of 37 closed**, re-derived from
the task files' status lines. Records: ISL-033 §9, ISL-031 §9.

## 🔴 s27 state (2026-10-07, read before anything below — "Do, in this order" items 1 and 2 are done or built)

- On `cline-dev`: the Slider's four (`21b27462d`, `c92fa2afa`), C64 (`d8a9f0069`), C93 (`fe5ebfab5`), ISL-038 opened (`6a5f1b55d`).
- **Built, graded, NOT landed:** D30 and `P109-S22-COLLECTIONCHURN` on worktree branch `p109-d30`
  (`/Users/richardosborne/vscode_projects/p109-d30`, tip `b7451602f`, rebased on `cf60225e1`; tsc 0; page-model, plants,
  stranger, schema, catalog-parity, pilot, batch-data green there). The landing (move `cline-dev` to it, write its files into the
  primary tree, apply its `page-model.helper.ts` hunks over a peer's open Group v2 edit) was refused by the auto-mode classifier —
  **Richard decides how it lands.** Rebase again first if HEAD moved.
- **New task ISL-038** (P107 R16 handed over C81–C94): C93 done; next the one-line throws C82, C84, C85, C87, C89 — each drops a
  known row from `conformance.test.ts`, which P107 (a1) has open for the Group v2 / C95. Ask C88, C90, C91, C92 first.

## What s26 found that s25's handoff did not know

- 🔴 **s25 left `stranger.test.ts` red.** Its D10 commit moved `delay.ts` and `Timer.json`, two files stranger round 3 is
  handed, without refreshing `stranger-suite-hashes.json`, and round 3's own Timer still said Unchanged for a queued Stop.
  Fixed `1d1496929`. **After any edit to a guarded spec or scenario (rounds 1–4: Counter, Switch, And, Condition, String
  Format, Inverter, Boolean To String, Timer, Repeat, Animate To Value, UUID, Screen Resolution, Dropdown) run
  `node -e "require('./tests/stranger-suite-hashes.helper.js').write()"` in `nodegx-node-spec` and check the diff names only
  your files.** A behaviour change on one of them also needs the stranger's own line moved, marked "not the stranger's line".
- **`docs:nodes:check` was red at HEAD** (s24's and s25's sentences never reached their docs pages). Run all four after a
  description change: `catalog:check`, `catalog:merge:check`, `docs:nodes:check`, `cloud-library:check`.
- **The controls' pattern.** Five of ISL-031's rows were one shape: a component keeps a copy of a value and re-reads the
  node's through an effect keyed on what React LAST RENDERED, while the node writes its props without a render. The fix each
  time: the node writes one value on both sides and counts its writes (`checkedWrites`, `valueWrites`); the effect keys on the
  count. **The Slider's C73 is the same shape** — start there.
- **A component's root can move between two elements that both stay on the page** (the label work): the node writes root
  styles straight onto the root (`setStyle`), React never learns them, so the element that stops being the root keeps them.
  `noodl-root-ref.ts clearedRootStyles` blanks them.
- **Description words are not a version** (NSP-010: a version is a behaviour change). D2/D6/D13 kept their spec versions.
- **Function's and Expression's Run**: wiring Run does not stop the inputs re-running the node; it stops only the run at load
  (and, for Function, on a code or used-file change). Measured, and now in both enrichments.
- 🔴 **Two harness traps cost time:** zsh does not split `$FILES` (use an array: `FILES=(a b); for f in $FILES`), and a helper
  that cut a predicate up to the next `\n};\n` ran past a one-line arrow to the end of `KNOWN_ROWS`, taking P107's open rows
  with it (rebuilt before anyone wrote the file). The fixed helper is in ISL-031 §9's spirit: cut rows first, then
  predicates, and treat a line ending in `;` as the whole arrow.

## The board (re-derive it from each task file's status line; never copy this table)

| state | tasks |
|---|---|
| ✅ closed (22) | ISL-001, 002, 003, 004, 005, 006, 011, 014, 015, 016, 017, 019, 020, 021, 023, 026, 027, 028, 029, 030, 032, 033 |
| 🟡 Track F, building | ISL-031 (14 of 23: left the Slider's four, C64, D30, C77, C78, C79) |
| 🟡 ruled, one reading owed | ISL-012 (AC3's full server render with hydration) · ISL-018 (AC5: the agent round) |
| 🟢 ruled, not built | ISL-013 ("A kit says what it needs") · ISL-024 ("Own package + a note", quiet gap only) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 → P18) · ISL-010 (AC4, Richard) · ISL-009 (export → P18) · ISL-007 (AC4 → P108) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, no rulings | ISL-034 … ISL-037 |

## Do, in this order

1. **The Slider** (ISL-031: C73, D36 known rows; C74, C75 rows the spec still models as the runtime does). C73 + D36 are the
   controls' pattern (count the node's Value writes; report a graph write without Changed — a second entry point that syncs
   without announcing, as D36's ledger proposes). C74 and C75 change the spec too (clamp and round to the step as the browser
   does; Percent 0 when Min = Max; a blank Min / Max is 0 / 100): spec v3, v4. **The Slider's conformance is the slowest spec**
   (27 minutes in s26's first run beside a peer's job, 5,474 mutants) — run it alone, and only `NSP_ONLY=net.noodl.controls.range`.
2. **C64 and D30** (shared, every control): a disabled control ignores a finger (keep hover); a control leaving the page resets
   and announces Focused / Hover / Pressed. Both change every control's spec — check P107's live edits first.
3. **C77, C78, C79** (the Text's drag rows): P107's Text v5 / Group spec was open in the working tree all of s26
   (`group.ts`, `Group.json`, the Group known rows). Check `git status` and mtimes; do these when P107 is done with them.
4. Then `P109-S22-COLLECTIONCHURN`, ISL-013 build, ISL-018 AC5, ISL-012 AC3.

## Decisions for Richard (not yours)

- **Layout of an unlabelled control (s26, measured in jsdom only).** The label fix puts every Text Input, Checkbox, Dropdown and
  Radio Button inside an outer `<div style="display: contents">` when it has no label. Layout should be unchanged (the box is
  taken out of layout) and author classes sit on the input, not the root; a stylesheet that selects a Group's children by
  position would see one more element. A real-browser check on a form template is owed before a release.
- `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY` (recommendation: yes), `P109-S20-LISTDEFAULTTYPE`,
  `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the Garden kits at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18 (export):** none filed in s26. Read, not run: And is exported as an expression (no "nothing yet" state); the exported
  Text Input types Value as text and has no hidden-field or Clear-outcome path. The exported controls were not checked for
  C66–C80, C67, C71, D34, C76, D37. Plus s25's and earlier lists (STATESRUN, FEEDZONE, BADBODY, …).
- **P107:** the Text Input's `person.release` surviving mutant at seed 20732 (present before s26's changes, gone at seed 13), the
  Slider's `world.place` survivor in s26's baseline, and a Text matrix scenario that threw "window is not defined" while the
  Group edit was open — all P107's to read.
- **Release notes, add (s26):** And's Result is false from the start. String Format's, Boolean To String's and Array's Changed
  descriptions, and Run on Function and Expression, say what the node does. Text Input: a text field's Value is always text;
  Clear says Done whenever it empties the field; Insert Text and Backspace in one frame each work on what the last write left,
  at the cursor it left; a Type or Max length change applies to writes in the same frame; a mouse press fires Pointer Down; a
  Text Area's cursor rests at the end; Value Changed's description says it fires on every write. Enable Label no longer takes
  the keyboard away or loses the control on Text Input, Checkbox, Dropdown and Radio Button. The Checkbox draws an app's Check
  / Uncheck right after a click. The Dropdown keeps a pick through hiding and a refreshed list, fires Changed only for a pick,
  and draws every Value written. Radio buttons show what the group's Value says after a write-back, and fire Changed only for
  the click (and the deselect it causes).

## Gate readings taken s26 (2026-10-06/07)

- **Per fix:** its specs at seeds 20732 and 13 conform (the Text Input's baseline survivor aside), every other mutant killed
  or declared; its control red on exactly its rows (each task's §9).
- Spec: pilot, catalog parity, stranger (rounds 1–4), schema, world, batch, batch-data, batch-time, batch-records,
  batch-navigation, types, runner, reach, canonical, adapter, coerce, counter, sha2, graph 123 / 123, page model green;
  batch-visual green but for P107's in-progress Group spec. Runtime graph 91 / 91. Viewer 1777 / 1777 after the label work.
  Runtime, spec, viewer tsc 0. catalog / merge / docs:nodes / cloud-library checks up to date. noodl-mcp description gates
  green (cmp001's red is `P109-S9-CMP001RATE`, filed). `bugs.js check` 5 problems, none P109's.
- **Closing (after the last code commit, `8dbeb8f33`):** viewer 1777 / 1777; runtime jest without the conformance file 3179
  passed, 1 failed — the known cold-start timeout on graph.test.ts's first scenario (91 / 91 alone).

## Recipes

- **A CAS commit:** `GIT_INDEX_FILE=<tmp>`, `git read-tree HEAD`, `git add` the paths (or `update-index --cacheinfo` a
  blob built from `git show HEAD:<path>` + your edit, for a file with a peer's open edit), check the staged count,
  `commit-tree`, `update-ref HEAD NEW BASE`, then **reset each committed path in the real index**
  (`git diff --name-only BASE NEW | while read f; do git reset -q -- "$f"; done`).
- **Dropping a known row:** run the spec with the row still listed first (its scenarios should read "passed" and the
  attribution 0), then remove the row and its predicate from BOTH the working `conformance.test.ts` and a copy of HEAD's, diff
  the two (the peer's lines must be all that differs), commit the HEAD copy. Unmark the row scenarios in the same commit.
- **A control:** back up each file by name (`cp $f $S/${f:t}`), `git show HEAD:$f > $f`, run, restore in the same command
  and `cmp`. With zsh, put paths in an array.
- **Splitting one file's hunks across commits:** replay `git diff -U0` hunks from HEAD by stage (s26's `stages.py` idea:
  assign each hunk by a keyword, assert the full replay equals the working file).
