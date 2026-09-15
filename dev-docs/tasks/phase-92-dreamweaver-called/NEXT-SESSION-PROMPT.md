# Phase 92 — next session

**Written 2026-09-15 at the end of s9 (CHR-008 slice 2: §3.4 identity).** Branch `cline-dev`. Phase commits:
`git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform half is `~/vscode_projects/nodegx-community`
(separate repo, no remote), deployed at `f39d20f` — s9 changed nothing there.

⚠️ `~/.claude/next-session-state/…json` holds a **P88 peer's** handoff; this file is the phase's.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling) |
| CHR-002 the type scale | ✅ Richard: "Looks good" |
| CHR-003 one radius, one shadow, one box model | ✅ Richard: "fine" |
| CHR-005 one launcher page | ✅ Richard: "fine" |
| CHR-006 the Templates tab gets its pictures | ✅ WORTHY |
| CHR-007 the rows become descriptors | ✅ built s4, invisible by design |
| CHR-012 the Community tab | ✅ closed as passable (Richard, after s8) |
| **CHR-008 the panel is one tree** | 🟡 **slice 1 (s8): R8** one line per switched-off group, Richard's condition gated. **Slice 2 (s9): §3.4 identity** — a node click no longer blanks the panel (§7). §3.1/3.2/3.5–3.8 not built |
| CHR-004, 009, 010, 011 | ⬜ not built |

## First job

1. **Commit state:** s9 is committed — `7fd6c5300` (code + `tests-unit/chr-008/panelIdentity.test.ts`) and the docs
   commit after it (task file, README, this file, `identity.js`, the five `identity-results.json`). Logs and PNGs stay
   local (gitignored). The P88 peer's `validation/{authoredCandidate,responsiveArrangement}.ts` were left uncommitted.
2. Nothing of Richard's is pending on built work. Go to the list below.

## Then, in order

1. **CHR-008 §3.5 focus — measure first, with a control that fires.** s9's arm B (type in Width, change Height on the
   model) graded nothing on BOTH builds: `Ports.bindModel` hears `parametersChanged` only for hints, so no row
   re-renders. Find a change that does re-render the rows while an input is focused — undo of a sibling
   (`modelParameterUndo` clears `_portsHash` and rebuilds every row) is the obvious one — and read focus + caret +
   attribute mutations on the next tick. If focus is lost there, that is §3.5's person-visible defect; if not, record it.
2. **CHR-008 §3.1/§3.2** — rows as siblings in one tree; the four decorators become `PropertyRow` props; R8's
   `groupGatesFor` already reads descriptors. `ColorType`, `CurveType`, `CodeEditorType` last, each its own commit + drive.
3. CHR-004 — smaller than scoped; CHR-005's `drive.js` `CONTRAST` prototypes R3's gate.
4. CHR-006 remainders (no ruling): plural chip labels; pictures for `site-builder` / `members-area`.

## Still Richard's

1. CHR-007 declined AC4's "≤ 1 `_portsHash = undefined`" (CHR-007 §6.2) — do not quietly revisit.
2. R6 final only on his look at CHR-009's screenshots; R7's marker-on-the-tab detail is proposed, not ruled.
3. The Projects tab's two full-width cards (BST-003 / UNI-001) — ask before moving them.
4. `members-area`'s live summary is lowercase and fragmentary (P86/P78 data).
5. Optional, not blocking: s9 changes no pixel at rest — clicking between nodes no longer flashes a blank panel and
   then jumps. If he wants to feel it, it is in the next dev build.

## What s9 settled, including where the handoff and the task file were wrong

- 🔴 **CHR-008's AC2 and AC5 rested on a false premise.** Measured on the **installed 0.2.4** before building: a Group
  reselect REPLACES the panel element, yet scroll 900, Width 240 and all 19 expanded groups come back — FB-017's
  view-state map does it. "Reverted identity ⇒ scroll lost" could never go red. The handoff's "AC5's reverted arm is
  one line" was right about the line and wrong about what it would show.
- **What the remount actually cost: a blink.** One reselect on 0.2.4: blank from 47 ms, rows at scroll 0 at 85 ms, jump
  to 900 at 115 ms — **8** in-between frames (sibling), **4** (via the Page Router).
- **The cause is one idiom:** `SidePanel` did `React.createElement(getPanelComponent(id))`, making the factory — a new
  arrow per selection — the element's *type*. Now `component()`, with `key` = panel id for a `followsSelection` panel and a
  per-creation key for the rest (their remount kept: `PortEditor` and the backend surfaces read `model` once).
- `PropertyEditor` builds the next node's view off screen, swaps when its rows exist (≤ 8 frames), disposes the previous
  view (whose scroll listener would otherwise write the new node's offsets under the old id — they share the scroller
  now), restores scroll in the same flush, and shows the header for the node whose rows are shown.
- Not built, on purpose (CHR-008 §7.6): keying by `componentInstanceId + nodeId` (that IS a remount per selection); a
  sidebar context for `rememberedTab`/view state (nothing measured asks for it).
- The handoff's "`SidePanel.tsx:84-101` force-recreates on `nodeSelected`" was accurate; it is gone.

## Readings taken (2026-09-15, s9, tree `65a3bd984` + s9's uncommitted work + the P88 peer's uncommitted files)

- Drives, all EXIT=0, `verdicts/CHR-008/2026-09-15/identity.js`: installed 0.2.4 **8 / 4** in-between frames
  (`identity-0.2.4-r3/`); this build on the dev stack **0 / 0**, panel root kept (`identity-fixed/`); reverted arm R1
  (per-creation key for `PropertyEditor`, renderer reloaded) **8 / 4** (`identity-reverted-R1/`). Scroll/Width restored
  in all three.
- jest `chr-008` + `chr-007` + `nat-012` + `fb-017` **15 / 15 suites, 205 tests**; mutants A (always a new key) **1 red**,
  B (no key) **1 red**, restored `cmp`-identical. Full `tests-unit` **444 / 444 suites, 7,324 tests**, EXIT=0.
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0** (after fixing one stray `}` of mine that the first run caught).
- `test:ci` (seed 25271, `.webpack-cache` cleared, no stack): **`Jasmine: 2984 specs, 8 failures`**, fresh
  `tests/test-results.json` 23:47:42 — **the floor's eight by full name** (SUB-011 ×3, NDA-017 `⚠️ records that Text Input
  has no checkbox port…` + `pins Expression's static inputs…`, SUB-006 ×3), 0 new. `tests/nodegraph/propertyeditor.js`
  imports the changed `propertyeditor/index` and is green.

## Traps

- 🔴 One heavy job at a time. A dev-stack rebuild after one file edit took **93–195 s** at ~180% CPU here; a VM on this
  machine holds ~3.7 cores. Tear the stack down (`npm run dev:stop` after checking every dev Electron's
  `--user-data-dir` is yours) BEFORE restoring a mutated file, or the restore costs another rebuild.
- 🔴 **A TS-always-truthy mutant does not compile under webpack** (`'X' && …`): `.logs/dev.log` says "Reload prevented"
  and the renderer keeps the old code — the arm grades nothing. Use `[value, 'MARKER'][0]` and confirm the marker in
  `localhost:8080/src/editor/index.bundle.js`, then `Page.reload`.
- ✅ **The installed app is a no-compile instrument** when `git log vX..HEAD -- <files>` is empty for the code under test:
  `env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 /Applications/NodeGX.app/Contents/MacOS/NodeGX --user-data-dir=<scratch>/fresh`;
  `window.__nodeGraphEditor` IS reachable there (the module registry is not).
- 🔴 A frame-count metric's "start" must be snapped IN the eval that makes the selection — the first animation frame
  after the call can already be the blank one (the first two drafts under-counted, `identity-0.2.4/`, `-r2/`).
- 🔴 zsh: `npx jest $DIRS` with a space-separated variable is ONE pattern — use `${=DIRS}`. No `timeout` binary on macOS.
- 🔴 Anything `CommunityTab` / `TemplatesTabBody` renders must be hook-free; anything reaching `PrimaryButton` needs the `Icon` stub.
- 🔴 A peer's untracked `tests-unit/validation/gam-022-*.test.ts`, `scripts/devtools/drive-gam014-kit-root.js`, and
  `templates/todo-list.security.json` are not this phase's — never commit them.
