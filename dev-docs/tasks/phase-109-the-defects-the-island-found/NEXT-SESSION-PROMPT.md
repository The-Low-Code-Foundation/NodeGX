# Next session — P109 session 2

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 1 (2026-10-01, on `cline-dev` from `22303a534`):** the phase scaffold committed; **ISL-001's fix landed
(`3df5adb82`), ISL-014's fix landed (`aab96a056`), ISL-002's AC1 measured** (`a0…` this session's last commit). 0 of 25
closed; three rulings asked (README §8).

## Read first

1. README §0, §4 (the board — three rows now carry a 🟡 note), §8 (three rulings with their measurements), §9.
2. ISL-001 §8, ISL-014 §8 and ISL-002 §8: what was measured, what landed, what is owed and why.

## 🔒 Ask Richard first, in plain words (one decision each)

1. **ISL-001 §5:** the Repeater no longer needs the 120 ms wait in front of a list it is given twice. Should Olive's
   Island drop its three waits (pad, crew, My robots)? *Recommended: yes, as ISL-025 W3, driven once.*
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
2. **ISL-025 W1 and W2** (slice 0) — 🔴 **blocked all of session 1 by P108 session 7**, which had `cg003Components.ts`,
   `cg003Template.test.ts` and `drives/drive-all.sh` dirty and a `drive-all.sh` run on the box. ISL-025 §4: no row lands
   while a P108 lane is open. Check `git status` and `stat` on those three files, and the peer list, before starting.
   ISL-001's AC6 and ISL-025 W3 (the three 120 ms waits) join W1/W2 at the same merge point if ruling 1 is yes.
3. **ISL-011** on its recommended route ((1a) docs/types/scaffold sentence; (2a) the export shim applies `defaultCss`).
   Its AC1 is a Chromium drive at 390 reading `getComputedStyle(root).display` — one heavy job.
4. **The owed drives:** ISL-001 AC5 (20 loads over the fixed runtime + the control over HEAD's), AC7 (IG-005's Teach-pad
   drive 8× before/after); ISL-014 AC6 (an agent reads the refusal, builds, re-binds, the page deploys with the kit node
   drawing). 🔴 **Rebuild first or the drive grades the old code:** `noodl-viewer-react` (the deploy bundle and the
   editor's viewer bundle are build outputs) for ISL-001; `npm run build` in `packages/noodl-mcp` for ISL-014 — at a
   quiet moment, because twelve installed servers ran from `dist/` all session and the worktrees link it.
5. **ISL-022 AC1** (the validator over three garden components + a 390 render of a `contentSize` wrapped row) and
   **ISL-018 AC2** (the editor) — measurements that decide rulings; each needs the box.

## Facts measured this session that are not in a task file

- 🔴 **Local `cline-dev` is 320 commits ahead of `origin/cline-dev`.** Pushing is Richard's decision; do not push unasked.
- **P78's register (`DEFECTS-THE-TEMPLATES-FOUND.md`) is a peer's uncommitted hunk since 09-27 (+159 lines), and the D83
  and D85 rows exist only there.** Session 1 set both owner cells (`ISL-014`, `ISL-001`) and statuses to 🟡 **in the
  working tree**; they ride with whoever commits the register. The committed record is the bug ledger
  (`dev-docs/bugs/p78-d85-…`, `p78-d83-…`, both `status: fixed` with their commits).
- **cn004 has a pre-existing red** (`still errors under strict`: 2 `unknown-node-type` for one stray node), measured
  the same with HEAD's door files restored — filed as `dev-docs/bugs/p109-s1-cn004-…md`. Not ISL-014's.
- `tsc -p packages/noodl-mcp --noEmit` prints errors only in peers' uncommitted P105–P108 specs (`cg005Olive`,
  `ig004Island`, `ig007Garden3d`, `iw007Animals`); none in any file this phase touched.
- Full `noodl-viewer-react` jest after ISL-001: 126 suites / 1,663 green. Two specs that pinned the OLD signal order
  (`erg-001-repeater-outcomes` "(filed, not fixed)" and `tests/repeater-items-rendered`) were updated with their reason.
- GAM-005 AC7 is answered in its §8 (the "give every row an id" sentence is not a cure; the P87 README `:143` note is
  its owner's to correct). ERG-001-S0's two "filed, not fixed" paragraphs are annotated fixed.
- The root `package.json` in the primary checkout is still a peer's uncommitted Nightbook manifest; read scripts with
  `git show HEAD:package.json`.

## Product findings (README §7)

Each NodeGX defect or gap met this session, with its row:

| finding | evidence | filed as |
|---|---|---|
| A For Each given a second list mid-build drew both sets (8 for 5 with ids, 10 for 5 id-less) and `Items Rendered` fired with the wrong rows | `isl-001-repeater-list-given-twice.test.ts`, ISL-001 §8 | **P78-D85 → fixed `3df5adb82`**; P109-F01 duplicate of it |
| The door refused a kit node as "ensure the module is installed" with the reader missing; `Texts` was pointed at `Text` | `isl014KitRefusal.test.ts`, ISL-014 §8 | **P78-D83 → fixed `aab96a056`** |
| A States node's first state sends `0` for `false` and `''` | `isl-002-states-first-state-false.test.ts`, ISL-002 §8 | P109 F02 (ISL-002; ledger row to add when the ruling lands) |
| Under strict validation one stray node type is reported twice | `cn004.test.ts` strict arm, control with HEAD's files | **P109-S1-CN004** (open, low) |
| ERG-001's filed `Items Rendered`-before-rows order | its corpus row | the same defect as D85's mechanism; fixed with it |
