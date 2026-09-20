# Phase 93 — next session

**Written 2026-09-20, end of session 27.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built TVW-004/005; s18 built and drove TVW-006; s19 got two rulings and reshaped
TVW-008; s20–22 built TVW-007's eyebrow, trail and hover; s23 built TVW-008's surface; s24 drove
TVW-007's hover; s25 closed TVW-007 AC1/AC6 and TVW-008 AC8; s26 drove TVW-008 for the first time.
**s27 BUILT THE FIX s26 NAMED AND REVERTED — the bench now opens on the first scenario through the
EXPORT — drove it 38/38, closed TVW-008 AC4, and took AC7's missing theme pair.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | ✅ | **AC1–AC4, AC6 green. ONLY AC5 (Richard's WORTHY) is left** |
| TVW-008 | The board | ✅ slices 1–2 | **AC1–AC6, AC8 ✅. ONLY AC7 (Richard's WORTHY) is left — six shots, both themes real** |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 62** (61 at s26; s27 added TVW-008 **AC4**).

## 🔴 Start here

1. 🔴 **THERE IS NO BUILD WORK LEFT ON ANY STARTED TASK. The next session MUST build TVW-009.**
   Every one of TVW-001…TVW-008 is either closed or waiting on a verdict only Richard can give.
   TVW-009 is unblocked (001, 002 and 004 are all built), it is the cheapest unstarted task on the
   board, and two sessions of polishing finished tasks instead would be the
   [[build-the-tasks-do-not-farm-the-defects]] failure exactly.
2. **FOUR verdicts are with Richard and nobody else can do any of them.** TVW-004 AC6 (20 shots,
   s18), TVW-006 AC5 (18 shots, s18), TVW-007's four placement shots (s20), and TVW-008 AC7 — now
   **SIX** shots in `verdicts/tvw-008/` (empty board, three frames before and after a rearrange,
   one frame benched, and the light/dark pair retaken at s27 with an arm that has a predicate in
   it: `light="light"`, `dark="dark"`, distinct md5s). The first two close their tasks on the
   spot; the last two are each the *only* thing left on their task. **Do not re-send them.** No
   ruling file had landed at s27.
3. **If Richard has ruled on TVW-007's placement**: the winner becomes a constant,
   `eyebrowPlacement.ts` is **deleted** with the three losing branches in `instanceEyebrow.ts`.
   🔴 A switch that outlives its verdict is a second copy of a decision.
4. Two §9.6 items no AC names are still owed on TVW-008, and they are the only unbuilt product
   work on a started task: **selection through a frame**, and the `Add all` bound **explained** in
   the picker rather than merely enforced. Neither blocks an AC, so neither is a first job.

## What s27 built — TVW-008 §11 has the whole of it

**`benchOpeningScenario` seeds `inputsRef` in the effect declared *before* the export-building
effect**, so the opening scenario's values go through `benchParameters` into the harness node's
`parameters` — the same call `boardFrameMounts` makes. That is the entire fix, and it is why the
two surfaces now agree *by construction* rather than by two implementations happening to match.

🔴 **Every later scenario switch is still a delta and must stay one.** Rebuilding the export
reloads the window and throws away the state the person is inspecting.

🔴 **The width had to come with it** (`benchOpeningFrame`, resolved in `VisualCanvas`, which owns
`frame`). `benchScenarioIsModified` compares the scenario's *recorded* width against the stage's,
and every scenario saved since FIX-011 records one — so values-only would have opened the bar
reading `Checkout ●` over a bench nobody had touched, offering a Save that would overwrite the
scenario's 480 with the stage's 768. **A second half-state, of exactly the kind s26 refused.**

⚠️ **Values in the child, width in the parent, and they must not swap.** Child effects run before
parent effects, so a width set in `ComponentBench` would be silently overwritten by
`VisualCanvas`'s stored-`bench.frame` writer. Nothing throws and no gate goes red.

⚠️ The `autoSelectedFor` bookkeeping s26 asked for is the effect's **dependency array**: keyed on
`target` alone, a Refresh or an `applyValueSet` remount cannot re-open a scenario someone
deliberately left with `None` — which matters because `None` and *never chose* are the same value.

## 🔴 What s27 learned the hard way

### `nohup` makes your own stack unattributable, and the drive is right to refuse

The drive exited 2 with *"could not attribute the editor on 9222 — owner=unknown"*.
`nohup npm run dev:debug &` leaves the stack with **PPID 1**, so `walkToCli` cannot reach the
launching session, and an unattributable owner is correctly treated as *possibly a peer's* rather
than as absent. **Launch the stack attached** — a backgrounded tool call, not `nohup` — and the
ancestry reaches the CLI pid. Cost: a teardown and a second seven-minute boot.

### 🔴 The temporary-index commit leaves the REAL index holding a staged REVERT of your own commit

This is the sharp one, and the recipe in the previous handoff does not prevent it.
`GIT_INDEX_FILE` + `commit-tree` + `update-ref` moves **HEAD** and never touches the real index —
which still holds the *pre-commit* content of your files. `git diff --cached` then shows your whole
commit **backwards**, and `git update-index --refresh` does **not** fix it: refresh updates stat
info, not content. A peer running `git commit` from that index would revert your work under their
name.

✅ **`git reset -q HEAD -- <only your paths>`** afterwards. It rewrites those index entries from
HEAD, leaves the working tree alone, and touches no other path. Then confirm
`git diff --cached --stat | wc -l` is **0** — and keep a control that the tree is not simply empty
(`git status --porcelain | wc -l` was 46, the peers' work, untouched).

## The gates, as of s27

- `tests-unit/tvw-008` **119 specs / 5 suites** (was 106 / 4 — `benchOpening.test.ts` adds 13).
- `tests-unit/tvw-007` **103 specs / 6 suites**, unchanged.
- **3 mutants, 3 killed**: the *last* scenario instead of the first, the scenario's width ignored,
  the interface filter dropped. Control green after each restore.
- `tests/canvas/board-export.test.ts` **+3 jasmine arms** — the board's and the bench's opening
  parameters compared as bytes, **with the control that they disagree without the fix**, because
  two empty objects are equal and an arm that only compared them would grade nothing.
- `typecheck:editor` **0**, `typecheck:editor-tests` **0**.
- **`test:main` 523 suites / 8375 specs, exit 0** — was 522 / 8362, so the delta is exactly the
  +1 suite and +13 specs this session adds and nothing stopped loading.
- ✅ **`test:ci` RUN AND AT THE FLOOR** — 3015 specs, 8 failures, **exactly the eight by name**
  (3 SUB-006, 3 SUB-011, 2 NDA-017), seed **15214** — a fifth distinct seed confirming the same
  set. Fresh readout at `packages/noodl-editor/tests/test-results.json`. s26 skipped this run; the
  debt is paid.

## The fixture

`scripts/devtools/tvw008-board-fixture.js` writes
`NodeGX test projects/TVW-008 s26 Board` deterministically and **checks its own claims before
exiting**. 🔴 **Re-run it before every drive** — a drive leaves `bench.board` behind, and AC1's
first arm is the *empty* board. Its Primary Button carries a scenario whose value differs from the
node's own parameter and whose `frame` is `480 × 200` while the component has **no** stored
`bench.frame` — which is precisely the case §11.2's width rule exists for.

## The drive hazard

`npm run dev:debug` exiting **144** is the single-instance lock *or* a clean teardown, not a
failure. **Two dev stacks cannot coexist** (`webpack.renderer.dev.js:24,38` hardcode 8080).
**Attribute before you touch**: `lsof -nP -iTCP:9222 -sTCP:LISTEN -t`, walk `ppid` to a Claude Code
pid, compare with your own. ⚠️ **`dev:stop --list` first.** ⏱️ The stack took ~75s to reach 9222 at
s27, not the seven minutes s26 recorded. s27 tore down twice (24 and 27 processes) leaving all 10
peer `noodl-mcp` Electrons alive both times.

🔴 **Gate on the SERVED bundle, never the one on disk** —
`packages/noodl-editor/src/editor/index.bundle.js` on disk is from Sep 10:

```
curl -s http://localhost:8080/src/editor/index.bundle.js | grep -c '<a string from your change>'
```

s27 gated on `benchOpeningScenario` (3 hits) **and** on the *absence* of a string the change
deleted — a present-and-absent pair, so the check could not pass on a stale bundle that happened
to contain the word.

## Committing

🔴 The working tree carries other sessions' work (46 entries at s27). **Commit through a temporary
index with a compare-and-swap** — `BASE=$(git rev-parse HEAD)`, `GIT_INDEX_FILE`,
`read-tree $BASE`, `update-index --add` **naming your paths** (untracked included; a pathspec
commit skips them), `write-tree`, `commit-tree -p $BASE`, `update-ref HEAD $NEW $BASE` — **and
then `git reset -q HEAD -- <your paths>`**, which the section above is about. **Re-read `HEAD`
immediately before each commit.**
⚠️ `scripts/devtools/` holds peers' untracked drive scripts — never `git add` that directory.
⚠️ `dev-docs/tasks/**/verdicts/**/*.png` is gitignored; shots are for Richard and the local record.
✅ But the **JSON readout beside them is tracked** for every other verdict set in this phase —
s26's `arms.json` was left untracked and s27 committed it. Commit yours with the shots' session.
