# Next session — P109 session 33

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 32 (2026-10-09, on `cline-dev`):** every row built in worktree `p109-isl049`, graded on the runtime at seeds 13 and 20732
with the interpreter's mutants at both, the trace of every scenario diffed against the spec version before, and a control (the
previous commit's file) red on exactly the scenarios it moved; landed by compare-and-swap.
**ISL-049 ✅ (11 of 11):** C128, C135, C140, C141 `e22334e0d`; C130 `009ad189b`, C129 `a5d6abb33`, C136 `4b63a1316`, C137 `cb85d2d69`,
C131 `21107c848`, C142 `0ece45228` + `2a82213cc`, C143 `c4b1da028` — For Each spec **v10** (task §7). **ISL-048** C138 `40c9fc310`
(Drag **v3**; 25 of 29, §11). **ISL-050** C133 `8d2fe2678`, C134 `73d7696ec` (Columns **v2**; 2 of 3, §7). **ISL-051** scoped (the
Expression, from P107 s64): C144 `99c61cede` (Expression **v2**), C145 asks Richard. Board: **25 of 51 closed**.

## Do, in this order

1. **ISL-050's C132** (ruled "Read the number as pixels"). The fix is in the runtime's generic size merge (`node.ts` :430-437 /
   `setInputValue`, and `react-component-node.ts` :698-745 deciding the prop), so it moves every visual node with a size port:
   re-measure first, then re-grade **every** visual spec at both seeds (`NSP_ONLY` with the visual types), not only the Columns.
2. **ISL-048's last four.** C114 (Children Count a frame late after a remount — read why first: the stack's
   `scheduleAfterInputsHaveUpdated` callbacks while its React component mounts). C139 (ruled: a new Component Stack option that
   keeps its pages through Mounted off and on — a new input: name it in the house style beside Keep When Leaving, describe it, a
   Page Stack spec version, both catalogs regenerated in the worktree (`generate.js`, `merge.js`, then `--check`), the noodl-mcp
   suite). C120, C126 still wait on P107's world (history back, an entry replaced).
3. **ISL-051's C145** once Richard rules (below), then ISL-013 slice 2, ISL-018 AC5, ISL-012 AC3. **Track G** waits on his order.

## What s32 learned

- **A runtime target's face can stand in for the defect.** `node-spec-target.ts` `repeaterParent` handed back never-settling
  promises at the Repeater's three throws (the real rejection failed jest). Fixing `foreach.tsx` alone changed nothing until the
  stand-ins went. When a fix "does nothing" on the runtime target, read the face for the node first.
- **A fix can unpin another row's grade.** C129 silenced Items Rendered for an addition with no row — the signal C128's timing
  scenario read; C138 made Start Drag X a number — the only way Constrain to parent showed with no layout. Sweep every hop count ±1
  and run the mutants at both seeds after every fix, not only the row's own scenarios. (Two For Each hop counts were never pinned —
  a queued copy, a rebuild with no Items — told P107.)
- **A ruling read literally can move a case its author never meant** (C133: "a number as its text" makes `0` apply). Keep the old
  pick test and read the value after it; say so in the ledger.
- **The probe truncates its report at 12,000 characters** — a control that "fails 44" may fail 78. `zz-s31-probe.test.ts` in the
  `p109-isl049` worktree now slices at 2,000,000.
- **A trace cannot show order within a settle** (a settle keeps one value per port): C142's pairing is graded at the node.
- **A source-text test reads variable names** (CMP-001 checks `itemActionItemId = model.getId()`).
- **`inputProps` take no `set`** — the generated setter overwrites it; `onChange` runs after the prop is written, before the render.

## Gate readings taken s32 (2026-10-09)

- For Each v10 at `2a82213cc`'s tree: runtime 296 / 296 at 13 and 20732, mutants 299 / 299 at both. Every registry spec (32)
  conforms at both seeds with its mutants (after C131); graph 91 / 91; noodl-runtime 3,077 / 3,077.
- Batch head (ISL-049): viewer 1,836 / 1,836, viewer tsc 0, spec tsc 0, spec package 932 / 932 without `stranger.test.ts`, catalogs
  `--check` clean, noodl-mcp 3,691 / 3,706 — the same 11 failures as the base `96341ed89` (CMP-001 AC2, CMP-004 ×4, D54, DEF-038,
  FLD-013, TPL-007, CN-004, AAQ-011 node ids).
- `stranger.test.ts`: Options fails at today's day seed (`person.blur` swap-branch survivor) — the same on the base; P107 confirmed.
- Drag v3 23 / 23, Expression v2 33 / 33, Columns v2 49 / 49 — each at both seeds, 0 survivors.
- `bugs.js check`: 5 problems, none P109's (two P109-S17/S19 regression paths and the P78 nested-signal file).

## Decisions for Richard (not yours)

- **C145 (ISL-051 §3), in plain words:** an Expression can't use a variable called `run`, `expression` or `evaluateAtLoad` — they
  are the node's own settings. Today the editor still draws an input for it, and the Expression fails every time. Should the editor
  (a) **refuse the name** — no input, and the node says "rename your variable" — or (b) **make it work** under another port name?
  Recommended (a).
- **C143's Refresh half (new):** a row fading out on its way off the list moves to the bottom when the list is refreshed — the rebuild
  has no rows left to place it among. Leave it, or remember where each fading row stood? Recommended: leave it (a Refresh redraws
  every row anyway, and the row is gone a moment later).
- Carried: **Track G's order** (ISL-039 data-loss blockers, ISL-040 security holes, or ISL-013 slice 2 first); the layout of an
  unlabelled control in a real browser; `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY`, `P109-S20-LISTDEFAULTTYPE`,
  `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the Garden kits at the origin.

## Handed over (owed by another phase)

- **P107 (opennoodl-a1):** told of every version above. Still theirs: the Video rows C96–C100 (open, never handed to P109), the two
  unpinned For Each hop counts, C120 / C126's world.
- **P18 (export):** none of s32's fixes checked on the exported app — the Repeater (all eleven, and `collection.ts`'s diff has an
  export twin), the Drag's text start, the Expression's Error, the Columns' band layouts and Auto Fit. Plus s31's and s30's lists.
- **Release notes, add (s32):** a list keeps drawing whatever it meets — a missing component, a Script's odd answer, a mapping that
  throws, an empty entry are named and skipped; items that share an id are one row in its first place; every Refresh gets its own
  answer; Items Rendered fires only when rows change; each row's Added and Leaving reach the graph with their own row; a row added
  while another fades out lands in its place. A Drag's start position from text is a number. An Expression clears its Error once it
  works. A Columns never blanks the page over a band layout or an Auto Fit gap.

## Worktrees

`p109-isl049` (branch `p109-isl050`, at `73d7696ec`) holds nothing unlanded; its untracked probes are `zz-s31-alltrace`,
`zz-s31-mut`, `zz-s32-killer` (spec) and `zz-s31-probe`, `zz-s32-rtrace` (runtime: both targets' traces for a scenario, with
`PROBE_DIR`) — never commit them. `p109-s32-base` (at `96341ed89`) is spent. s31's list (`p109-isl048`, `p109-drag`, `p109-c127`,
`p109-s31-land`, `p109-c77`, `p109-c101`, `p109-s30-*`, `p109-isl031-drag`, `p109-s12`) is spent too. Remove with `git worktree
remove` when convenient.

## Recipes

- **Land:** commit in the worktree; `git diff --name-only <base> HEAD > list`; in the primary tree, in ONE command: check
  `merge-base --is-ancestor <cline-dev> <new>` (else rebase the worktree first), `git status --porcelain` each listed path (abort on
  any), `git update-ref refs/heads/cline-dev <new> <old>`, `git checkout HEAD -- <each path>`. Then the docs commit by pathspec.
- **Trace diff across a fix:** `TYPES='<type>' OUT=<file> npx jest tests/zz-s31-alltrace.test.ts` before and after; compare by
  scenario order when names were renamed in between.
- **A control:** copy the fixed file aside, `git show HEAD:<file> > <file>`, run the probe, copy back, `cmp`. Compare the failed
  names with the moved ones as sets.
- **Hop-count sweep:** `sed -i '' '<line>s/hops = N/hops = N±1/'` on a copy of the spec, run the probe, restore — a count that
  passes at ±1 is unpinned.
- **Viewer tsc:** `npx tsc -p packages/noodl-viewer-react --noEmit`. **zsh:** a file list needs `${=files}`; `--include=*.ts` is a
  glob error — use `git grep`.
