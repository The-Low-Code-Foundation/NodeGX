# Next session — P109 session 3

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 1 (2026-10-01):** ISL-001's fix (`3df5adb82`), ISL-014's fix (`aab96a056`), ISL-002's AC1 measured (`b5c1b6453`).
**Session 2 (2026-10-02, on `cline-dev` from `68b1549f5`): ISL-025's slice 0 landed (W1 both loops on `Repeat`, W2 every
garden drive on `nodegx deploy`), ISL-011 built on its recommended route (1a + 2a).** 0 of 25 closed; the same three
rulings still open (README §8). Commits: see `git log --since=2026-10-02 --author=Richard -- dev-docs/tasks/phase-109*`.

## Read first

1. README §0, §4 (the board — five rows carry a 🟡 note), §8 (three rulings with their measurements), §9.
2. ISL-025 §8 (slice 0: what landed, the census spec, the drive readings), ISL-011 §8 (both AC1 readings, the census of
   shipped kits, what is owed), ISL-001 §8 and ISL-014 §8 (session 1), ISL-002 §8.

## 🔒 Ask Richard first, in plain words (one decision each) — unchanged from session 1

1. **ISL-001 §5:** the Repeater no longer needs the 120 ms wait in front of a list it is given twice. Should Olive's
   Island drop its three waits (pad, crew, My robots)? *Recommended: yes, as ISL-025 W3, driven once.* (The merge point
   it waited for has come; only this ruling blocks it now.)
2. **ISL-014 §5:** when the kit reader is missing from a checkout, should the door only say so and name the command
   (done), or also build it on demand the first time so a fresh worktree never shares the primary's bundle?
   *Recommended: say so now (done); build on demand next; never commit the bundle.*
3. **ISL-002 §5:** a States node that starts in its first state sends the number 0 where that state says `false` or an
   empty text (measured: `0`, `number`, both transition settings; the return path sends `false`/`''`). Should it send
   exactly what the state says, typed, as every later move does? And should the exported States library change in the
   same commit? *Recommended: yes and yes.*

## Build, in this order

1. **ISL-002's fix** once ruling 3 is in: one helper decides a state's value by type, called by `jumpToState` and
   `goToState` (`states.ts:633` is the `|| 0`); flip the spec's two `test.failing` rows to `test` and delete its
   "what arrives at HEAD" row; AC2's sabotage arm; `statesLib.ts:330` under ruling 2; AC4's census before landing.
2. **ISL-025 W3** once ruling 1 is in (with ISL-001 AC6): drop `pdSettle`/`pdHold`, `iwCrewSettle`/`iwCrewHold`,
   `rbSettle`/`rbHold` and `LATCH_SCRIPT` if nothing else uses it; flip W3's census row to `removed`; regenerate; the
   pad and My robots drives (`drive-cg003-pages.js`, `drive-ig005-robots.js`) once.
3. **The owed drives:** ISL-001 AC5 (20 loads over the fixed runtime + the control over HEAD's), AC7 (IG-005's Teach-pad
   drive 8× before/after); ISL-014 AC6 (an agent reads the refusal, builds, re-binds, the page deploys with the kit node
   drawing). 🔴 **Rebuild first or the drive grades the old code:** `noodl-viewer-react` (the deploy bundle and the
   editor's viewer bundle are build outputs) for ISL-001; `npm run build` in `packages/noodl-mcp` for ISL-014 — at a
   quiet moment: twelve installed servers run from `dist/` and the worktrees link it.
4. **ISL-011's two owed arms:** the editor canvas reading (`run-editor`, the fixture `nodegx-export/tests/fixtures/isl011-kit-grid`
   opened as a copy) and the port-write-after-mount drive (change the node's opacity after mount; the grid must stay).
5. **ISL-022 AC1** (the validator over three garden components + a 390 render of a `contentSize` wrapped row) and
   **ISL-018 AC2** (the editor) — measurements that decide rulings; each needs the box.
6. **Then the Track B and D rulings**, asked together (README §9).

## Facts measured this session that are not in a task file

- 🔴 **Parallel Bash calls share one shell:** a `cd` in one call flipped a sibling's cwd mid-command (a jest ran in the
  wrong package, a `nodegx deploy` read MODULE_NOT_FOUND). Wrap every call in `( cd /abs && … )` and use absolute paths.
  Saved as a memory.
- **`tsc -p packages/noodl-mcp --noEmit` prints 16 errors, none in this session's files.** Three are in
  `cg003Template.test.ts` (`:788`, `:1568`, `:2357`, `as string[]`/`Record` casts) — P108's lines, committed at
  `c051ca68d`; ts-jest runs that package with diagnostics off, so nothing grades them. Not fixed here (P108's).
- **GAM-015's types-copy gate was red at HEAD (8 rows)** — the seven shipped kits' `types/node-kit.d.ts` were stale since
  09-17 and the count literal said 5 for 7 kits. Refreshed and the gate names the kits now; filed
  `dev-docs/bugs/p109-s2-gam015-…md`. nightbook's, rocket-school's and digital-bricks-training's own copies are still
  stale, left to their templates.
- **The drive set's timings on this box, quiet:** `drive-all.sh island` took ~35 min (generator ~2 min, pages drive
  ~25 min, island ~5 min). The pages drive has 331 clauses, not the 132 `check(` sites (loops over EN/FR and viewports).
- **ISL-025 §2's readings that moved:** W10 counts 199 `!important` (197 at scoping); W5's prefixes are
  `padkey-`/`jobline-` at `cg003Scripts.ts:357`/`:1484`. The census spec carries both.
- **Local `cline-dev` is far ahead of `origin/cline-dev`** (381 at session 1's count, more now). Pushing is Richard's
  decision; do not push unasked.
- P78's register (`DEFECTS-THE-TEMPLATES-FOUND.md`) is still a peer's uncommitted hunk; the D83/D85 owner cells ride with
  it. The P84 register's P40 row was clean and is annotated (`defaultCss` half → ISL-011).

## Product findings (README §7)

| finding | evidence | filed as |
|---|---|---|
| A kit node's `defaultCss` arrives inline and beats the kit's own stylesheet; the export dropped it | `drive-isl011-kit-display.js` readings (block vs grid), `isl-011-…test.ts` | **P109-F15 → fixed** (docs + export; the inline behaviour kept by ruling 1a) |
| The shipped kits' type copies were stale and the gate that grades them had an outgrown count | `types-copy.test.js` at HEAD, control with `git show` | **P109-S2-GAM015COPIES → fixed** |
| `Repeat`'s Start-while-running = Unchanged is exactly what a loop restarted by its own tick needed; the Timer chain had to *not restart* in five places | ISL-025 §8 W1 | none — the product behaved; recorded as the pattern (W1) |
| `nodegx deploy` exits 11 / 2 and writes nothing on a refusal; the internal bundle's exit 0 is its contract | ISL-025 §8 W2 arms | none — AUDIT §2's correction confirmed by measurement |
